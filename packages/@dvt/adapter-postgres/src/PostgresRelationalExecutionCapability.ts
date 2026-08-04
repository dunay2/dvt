/**
 * @file packages/@dvt/adapter-postgres/src/PostgresRelationalExecutionCapability.ts
 * @baseline ADR-0003: Execution Model
 * @baseline ADR-0014: Run-driven adapter model
 * @decision Transformation execution remains capability-led: runtime dispatches StepKind and Postgres provides one relational SQL implementation
 * @consequence SQL-first plans can execute through governed Postgres step activities without hard-coding vendor logic into workflow control flow
 * @version 1.0.0
 * @date 2026-04-09
 */
import { asIsoUtcString, asNonBlankString } from '@dvt/contracts';
import type {
  ExecutionPlan,
  LoadObjectFileToPostgresStepTypeConfig,
  MaterializationEvidence,
} from '@dvt/contracts';
import type { Pool, PoolClient, QueryResult } from 'pg';

import { PostgresAdapterClientSession } from './PostgresAdapterClientSession.js';
import { resolvePostgresConnectionString } from './PostgresAdapterConnectionString.js';
import { POSTGRES_ADAPTER_RUNTIME_CONSTANTS as C } from './PostgresAdapterConstants.js';
import { createObservedPostgresPool } from './PostgresPoolErrorPolicy.js';
import { normalizeSchema, quoteIdentifier } from './sqlUtils.js';

export interface RuntimeStepExecutionContext {
  executionIdentity: RuntimeExecutionIdentity;
  gatewayContext?: Record<string, unknown>;
}

export interface RuntimeExecutionIdentity {
  tenantId: string;
  runId: string;
  environmentId: string;
}

export interface RuntimeStepResult {
  stepId: string;
  status: 'COMPLETED' | 'FAILED';
  resultEvidence?: MaterializationEvidence;
  failureReason?: string;
  retriable?: boolean;
  error?: string;
}

export interface RuntimeStepActivity {
  execute(
    step: ExecutionPlan['steps'][number],
    context: RuntimeStepExecutionContext
  ): Promise<RuntimeStepResult>;
}

export type RuntimeStepActivityRegistry = ReadonlyMap<string, RuntimeStepActivity>;

export interface PostgresRelationalExecutionCapabilityConfig {
  connectionString?: string;
  pool?: Pool;
  statementTimeoutMs?: number;
  queryTimeoutMs?: number;
  nowIsoUtc?: () => string;
}

export type PostgresObjectFileScalar = string | number | boolean | null;

export interface PostgresObjectFileLoadInput {
  readonly schema: 'staging';
  readonly relation: string;
  readonly columns: LoadObjectFileToPostgresStepTypeConfig['columns'];
  readonly rows: readonly Readonly<Record<string, PostgresObjectFileScalar>>[];
  readonly signal?: globalThis.AbortSignal;
}

export interface PostgresObjectFileLoadResult {
  readonly rowsWritten: number;
  readonly publicationOutcome: 'created' | 'replaced';
}

interface PrepareTransformConfig {
  targetSchema: string;
}

interface SqlTransformConfig {
  sql: string;
  sink: RelationalSinkRef;
  materialization: 'table';
  writeMode: 'replace';
}

interface CaptureEvidenceConfig {
  sink: RelationalSinkRef;
}

interface RelationalSinkRef {
  schema: string;
  table: string;
}

const FAILURE_REASON = Object.freeze({
  prepareConfigInvalid: 'POSTGRES_PREPARE_TRANSFORM_CONFIG_INVALID',
  prepareFailed: 'POSTGRES_PREPARE_TRANSFORM_ERROR',
  transformConfigInvalid: 'POSTGRES_SQL_TRANSFORM_CONFIG_INVALID',
  transformFailed: 'POSTGRES_SQL_TRANSFORM_ERROR',
  captureConfigInvalid: 'POSTGRES_CAPTURE_MATERIALIZATION_EVIDENCE_CONFIG_INVALID',
  captureFailed: 'POSTGRES_CAPTURE_MATERIALIZATION_EVIDENCE_ERROR',
});

const OBJECT_FILE_MAX_BIND_PARAMETERS = 60_000;
const OBJECT_FILE_MAX_ROWS_PER_BATCH = 1_000;

export class PostgresRelationalExecutionCapability {
  public readonly stepActivitiesByKind: RuntimeStepActivityRegistry;

  private readonly pool: Pool;
  private readonly ownsPool: boolean;
  private readonly clientSession: PostgresAdapterClientSession;
  private readonly nowIsoUtc: () => string;

  constructor(config: PostgresRelationalExecutionCapabilityConfig) {
    const statementTimeoutMs =
      config.statementTimeoutMs ??
      Number(process.env[C.statementTimeoutEnvVar] ?? C.defaultTimeoutMs);

    if (config.pool) {
      this.pool = config.pool;
      this.ownsPool = false;
    } else {
      const connectionString = resolvePostgresConnectionString(config.connectionString);
      this.pool = createObservedPostgresPool({
        connectionString,
        statement_timeout: statementTimeoutMs,
        query_timeout:
          config.queryTimeoutMs ?? Number(process.env[C.queryTimeoutEnvVar] ?? C.defaultTimeoutMs),
      });
      this.ownsPool = true;
    }

    this.clientSession = new PostgresAdapterClientSession(this.pool, statementTimeoutMs);
    this.nowIsoUtc = config.nowIsoUtc ?? (() => new Date().toISOString());
    this.stepActivitiesByKind = new Map([
      [
        'PREPARE_POSTGRES_TRANSFORM',
        {
          execute: async (step, context) => this.prepareTransform(step, context),
        } satisfies RuntimeStepActivity,
      ],
      [
        'POSTGRES_SQL_TRANSFORM',
        {
          execute: async (step, context) => this.executeSqlTransform(step, context),
        } satisfies RuntimeStepActivity,
      ],
      [
        'CAPTURE_MATERIALIZATION_EVIDENCE',
        {
          execute: async (step, context) => this.captureMaterializationEvidence(step, context),
        } satisfies RuntimeStepActivity,
      ],
    ]);
  }

  async close(): Promise<void> {
    await this.clientSession.close(this.ownsPool);
  }

  public async load(input: PostgresObjectFileLoadInput): Promise<PostgresObjectFileLoadResult> {
    assertNotAborted(input.signal);
    const schema = normalizeObjectFileSchema(input.schema);
    const relation = normalizeSchema(input.relation);
    const columns = normalizeObjectFileColumns(input.columns);
    const target = `${quoteIdentifier(schema)}.${quoteIdentifier(relation)}`;

    return this.clientSession.withTransaction(async (client) => {
      await queryWithSignal(
        client,
        `CREATE SCHEMA IF NOT EXISTS ${quoteIdentifier(schema)}`,
        [],
        input.signal
      );
      const existing = await queryWithSignal<{ target_relation: string | null }>(
        client,
        'SELECT to_regclass($1) AS target_relation',
        [`${schema}.${relation}`],
        input.signal
      );
      const publicationOutcome = existing.rows[0]?.target_relation
        ? ('replaced' as const)
        : ('created' as const);

      await queryWithSignal(client, `DROP TABLE IF EXISTS ${target}`, [], input.signal);
      await queryWithSignal(
        client,
        `CREATE TABLE ${target} (${columns.map(formatObjectFileColumnDefinition).join(', ')})`,
        [],
        input.signal
      );
      await insertObjectFileRows(client, target, columns, input.rows, input.signal);
      assertNotAborted(input.signal);

      return {
        rowsWritten: input.rows.length,
        publicationOutcome,
      };
    });
  }

  private async prepareTransform(
    step: ExecutionPlan['steps'][number],
    _context: RuntimeStepExecutionContext
  ): Promise<RuntimeStepResult> {
    const parsed = parsePrepareTransformConfig(step);
    if (!parsed.ok) {
      return failedStepResult(
        step.stepId,
        FAILURE_REASON.prepareConfigInvalid,
        parsed.error,
        false
      );
    }

    try {
      await this.clientSession.withClient((client) =>
        client.query(`CREATE SCHEMA IF NOT EXISTS ${quoteIdentifier(parsed.value.targetSchema)}`)
      );
      return completedStepResult(step.stepId);
    } catch (error: unknown) {
      return failedStepResult(
        step.stepId,
        FAILURE_REASON.prepareFailed,
        toErrorMessage(error),
        isTransientPostgresError(error)
      );
    }
  }

  private async executeSqlTransform(
    step: ExecutionPlan['steps'][number],
    _context: RuntimeStepExecutionContext
  ): Promise<RuntimeStepResult> {
    const parsed = parseSqlTransformConfig(step);
    if (!parsed.ok) {
      return failedStepResult(
        step.stepId,
        FAILURE_REASON.transformConfigInvalid,
        parsed.error,
        false
      );
    }

    const targetTable = qualifySinkRef(parsed.value.sink);

    try {
      await this.clientSession.withTransaction(async (client) => {
        await client.query(`DROP TABLE IF EXISTS ${targetTable}`);
        await client.query(`CREATE TABLE ${targetTable} AS ${parsed.value.sql}`);
      });
      return completedStepResult(step.stepId);
    } catch (error: unknown) {
      return failedStepResult(
        step.stepId,
        FAILURE_REASON.transformFailed,
        toErrorMessage(error),
        isTransientPostgresError(error)
      );
    }
  }

  private async captureMaterializationEvidence(
    step: ExecutionPlan['steps'][number],
    context: RuntimeStepExecutionContext
  ): Promise<RuntimeStepResult> {
    const parsed = parseCaptureEvidenceConfig(step);
    if (!parsed.ok) {
      return failedStepResult(
        step.stepId,
        FAILURE_REASON.captureConfigInvalid,
        parsed.error,
        false
      );
    }

    const startedAt = this.nowIsoUtc();
    const targetTable = qualifySinkRef(parsed.value.sink);

    try {
      const rowsWritten = await this.clientSession.withClient(async (client) => {
        const result = await client.query<{ rows_written: string }>(
          `SELECT COUNT(*)::bigint AS rows_written FROM ${targetTable}`
        );
        return Number(result.rows[0]?.rows_written ?? 0);
      });
      const completedAt = this.nowIsoUtc();
      return {
        stepId: step.stepId,
        status: 'COMPLETED',
        resultEvidence: {
          executor: 'postgres',
          environmentId: asNonBlankString(context.executionIdentity.environmentId),
          sinkTable: asNonBlankString(formatSinkRef(parsed.value.sink)),
          rowsWritten,
          startedAt: asIsoUtcString(startedAt),
          completedAt: asIsoUtcString(completedAt),
          durationMs: computeDurationMs(startedAt, completedAt),
        },
      };
    } catch (error: unknown) {
      return failedStepResult(
        step.stepId,
        FAILURE_REASON.captureFailed,
        toErrorMessage(error),
        isTransientPostgresError(error)
      );
    }
  }
}

interface NormalizedObjectFileColumn {
  readonly targetColumn: string;
  readonly dataType: LoadObjectFileToPostgresStepTypeConfig['columns'][number]['dataType'];
  readonly nullable: boolean;
}

function normalizeObjectFileSchema(schema: string): 'staging' {
  if (schema !== 'staging') {
    throw new Error('POSTGRES_OBJECT_FILE_SCHEMA_INVALID');
  }
  return schema;
}

function normalizeObjectFileColumns(
  columns: LoadObjectFileToPostgresStepTypeConfig['columns']
): readonly NormalizedObjectFileColumn[] {
  if (columns.length === 0) {
    throw new Error('POSTGRES_OBJECT_FILE_COLUMNS_REQUIRED');
  }

  const targetColumns = new Set<string>();
  return columns.map((column) => {
    const targetColumn = normalizeSchema(column.targetColumn);
    if (targetColumns.has(targetColumn)) {
      throw new Error('POSTGRES_OBJECT_FILE_TARGET_COLUMN_DUPLICATE');
    }
    targetColumns.add(targetColumn);
    return {
      targetColumn,
      dataType: column.dataType,
      nullable: column.nullable,
    };
  });
}

function formatObjectFileColumnDefinition(column: NormalizedObjectFileColumn): string {
  return `${quoteIdentifier(column.targetColumn)} ${toPostgresColumnType(column.dataType)}${column.nullable ? '' : ' NOT NULL'}`;
}

function toPostgresColumnType(dataType: NormalizedObjectFileColumn['dataType']): string {
  switch (dataType) {
    case 'text':
      return 'TEXT';
    case 'integer':
      return 'INTEGER';
    case 'bigint':
      return 'BIGINT';
    case 'numeric':
      return 'NUMERIC';
    case 'boolean':
      return 'BOOLEAN';
    case 'date':
      return 'DATE';
    case 'timestamp':
      return 'TIMESTAMP';
    case 'timestamp-with-time-zone':
      return 'TIMESTAMPTZ';
  }
}

async function insertObjectFileRows(
  client: PoolClient,
  target: string,
  columns: readonly NormalizedObjectFileColumn[],
  rows: readonly Readonly<Record<string, PostgresObjectFileScalar>>[],
  signal: globalThis.AbortSignal | undefined
): Promise<void> {
  if (rows.length === 0) {
    return;
  }

  const batchSize = Math.max(
    1,
    Math.min(
      OBJECT_FILE_MAX_ROWS_PER_BATCH,
      Math.floor(OBJECT_FILE_MAX_BIND_PARAMETERS / columns.length)
    )
  );
  const quotedColumns = columns.map((column) => quoteIdentifier(column.targetColumn)).join(', ');

  for (let offset = 0; offset < rows.length; offset += batchSize) {
    assertNotAborted(signal);
    const batch = rows.slice(offset, offset + batchSize);
    const values: PostgresObjectFileScalar[] = [];
    const tuples = batch.map((row) => {
      const placeholders = columns.map((column) => {
        values.push(row[column.targetColumn] ?? null);
        return `$${values.length}`;
      });
      return `(${placeholders.join(', ')})`;
    });
    await queryWithSignal(
      client,
      `INSERT INTO ${target} (${quotedColumns}) VALUES ${tuples.join(', ')}`,
      values,
      signal
    );
  }
}

async function queryWithSignal<Row extends Record<string, unknown> = Record<string, unknown>>(
  client: PoolClient,
  text: string,
  values: readonly unknown[],
  signal: globalThis.AbortSignal | undefined
): Promise<QueryResult<Row>> {
  assertNotAborted(signal);
  return client.query<Row>({
    text,
    values: [...values],
    ...(signal === undefined ? {} : { signal }),
  });
}

function assertNotAborted(signal: globalThis.AbortSignal | undefined): void {
  if (signal?.aborted === true) {
    throw signal.reason ?? new Error('PostgreSQL object-file load was cancelled.');
  }
}

function parsePrepareTransformConfig(
  step: ExecutionPlan['steps'][number]
): { ok: true; value: PrepareTransformConfig } | { ok: false; error: string } {
  const stepTypeConfig = asPlainObject(step.stepTypeConfig);
  if (!stepTypeConfig) {
    return { ok: false, error: 'stepTypeConfig must be an object' };
  }

  const targetSchema = normalizeIdentifier(stepTypeConfig['targetSchema'], 'targetSchema');
  if (!targetSchema.ok) {
    return { ok: false, error: targetSchema.error };
  }

  return {
    ok: true,
    value: {
      targetSchema: targetSchema.value,
    },
  };
}

function parseSqlTransformConfig(
  step: ExecutionPlan['steps'][number]
): { ok: true; value: SqlTransformConfig } | { ok: false; error: string } {
  const stepTypeConfig = asPlainObject(step.stepTypeConfig);
  if (!stepTypeConfig) {
    return { ok: false, error: 'stepTypeConfig must be an object' };
  }

  const sql = normalizeNonBlankString(stepTypeConfig['sql'], 'sql');
  if (!sql.ok) return { ok: false, error: sql.error };

  const sink = parseRelationalSinkRef(stepTypeConfig);
  if (!sink.ok) return { ok: false, error: sink.error };

  if (stepTypeConfig['materialization'] !== 'table') {
    return { ok: false, error: 'materialization must be table' };
  }
  if (stepTypeConfig['writeMode'] !== 'replace') {
    return { ok: false, error: 'writeMode must be replace' };
  }

  return {
    ok: true,
    value: {
      sql: sql.value,
      sink: sink.value,
      materialization: 'table',
      writeMode: 'replace',
    },
  };
}

function parseCaptureEvidenceConfig(
  step: ExecutionPlan['steps'][number]
): { ok: true; value: CaptureEvidenceConfig } | { ok: false; error: string } {
  const stepTypeConfig = asPlainObject(step.stepTypeConfig);
  if (!stepTypeConfig) {
    return { ok: false, error: 'stepTypeConfig must be an object' };
  }

  const sink = parseRelationalSinkRef(stepTypeConfig);
  if (!sink.ok) return { ok: false, error: sink.error };

  return {
    ok: true,
    value: {
      sink: sink.value,
    },
  };
}

function parseRelationalSinkRef(
  stepTypeConfig: Record<string, unknown>
): { ok: true; value: RelationalSinkRef } | { ok: false; error: string } {
  const schema = normalizeIdentifier(stepTypeConfig['sinkSchema'], 'sinkSchema');
  if (!schema.ok) return { ok: false, error: schema.error };

  const table = normalizeIdentifier(stepTypeConfig['sinkTable'], 'sinkTable');
  if (!table.ok) return { ok: false, error: table.error };

  return {
    ok: true,
    value: {
      schema: schema.value,
      table: table.value,
    },
  };
}

function qualifySinkRef(sink: RelationalSinkRef): string {
  return `${quoteIdentifier(sink.schema)}.${quoteIdentifier(sink.table)}`;
}

function formatSinkRef(sink: RelationalSinkRef): string {
  return `${sink.schema}.${sink.table}`;
}

function asPlainObject(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function normalizeNonBlankString(
  value: unknown,
  fieldName: string
): { ok: true; value: string } | { ok: false; error: string } {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return { ok: false, error: `${fieldName} must be a non-empty string` };
  }
  return { ok: true, value: value.trim() };
}

function normalizeIdentifier(
  value: unknown,
  fieldName: string
): { ok: true; value: string } | { ok: false; error: string } {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return { ok: false, error: `${fieldName} must be a non-empty string` };
  }

  try {
    return { ok: true, value: normalizeSchema(value.trim()) };
  } catch (error: unknown) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

function completedStepResult(stepId: string): RuntimeStepResult {
  return { stepId, status: 'COMPLETED' };
}

function failedStepResult(
  stepId: string,
  failureReason: string,
  error: string,
  retriable: boolean
): RuntimeStepResult {
  return {
    stepId,
    status: 'FAILED',
    failureReason,
    retriable,
    error,
  };
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return typeof error === 'string' ? error : 'Unknown PostgreSQL execution failure';
}

function isTransientPostgresError(error: unknown): boolean {
  const code = readErrorCode(error);
  if (code === undefined) {
    return false;
  }
  return (
    code.startsWith('08') ||
    code.startsWith('53') ||
    code === '57P01' ||
    code === '57P02' ||
    code === '57P03' ||
    code === '57014'
  );
}

function readErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return undefined;
  }
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' && code.length > 0 ? code : undefined;
}

function computeDurationMs(startedAt: string, completedAt: string): number {
  const started = Date.parse(startedAt);
  const completed = Date.parse(completedAt);
  if (!Number.isFinite(started) || !Number.isFinite(completed)) {
    return 0;
  }
  return Math.max(0, completed - started);
}
