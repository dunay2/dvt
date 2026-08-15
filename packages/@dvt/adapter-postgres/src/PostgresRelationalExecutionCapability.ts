/**
 * @file packages/@dvt/adapter-postgres/src/PostgresRelationalExecutionCapability.ts
 * @baseline ADR-0003: Execution Model
 * @baseline ADR-0014: Run-driven adapter model
 * @decision Transformation execution remains capability-led: runtime dispatches StepKind and Postgres provides one relational SQL implementation
 * @consequence SQL-first plans can execute through governed Postgres step activities without hard-coding vendor logic into workflow control flow
 * @version 1.0.0
 * @date 2026-04-09
 */
import {
  CaptureMaterializationEvidenceStepTypeConfigSchema,
  PostgresSqlTransformStepTypeConfigSchema,
  PreparePostgresTransformStepTypeConfigSchema,
  asIsoUtcString,
  asNonBlankString,
} from '@dvt/contracts';
import type { ExecutionPlan, MaterializationEvidence, ResolvedRunContext } from '@dvt/contracts';
import type { Pool } from 'pg';

import { PostgresAdapterClientSession } from './PostgresAdapterClientSession.js';
import { resolvePostgresConnectionString } from './PostgresAdapterConnectionString.js';
import { POSTGRES_ADAPTER_RUNTIME_CONSTANTS as C } from './PostgresAdapterConstants.js';
import {
  PostgresObjectFileLoader,
  type PostgresObjectFileLoadInput,
  type PostgresObjectFileLoadResult,
} from './PostgresObjectFileLoader.js';
import {
  PostgresPlanConnectionRejectedError,
  type IPostgresPlanConnectionResolver,
  type PostgresPlanConnection,
} from './PostgresPlanConnectionResolver.js';
import { createObservedPostgresPool } from './PostgresPoolErrorPolicy.js';
import { normalizeSchema, quoteIdentifier } from './sqlUtils.js';

export interface RuntimeStepExecutionContext {
  executionIdentity: RuntimeExecutionIdentity;
  runContext: ResolvedRunContext;
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
  planConnectionResolver?: IPostgresPlanConnectionResolver;
  planPoolFactory?: (binding: PostgresPlanConnection) => Pool;
  maxPlanClientSessions?: number;
}

interface PlanClientSessionEntry {
  readonly clientSession: PostgresAdapterClientSession;
  activeLeases: number;
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

const DEFAULT_MAX_PLAN_CLIENT_SESSIONS = 32;

export class PostgresRelationalExecutionCapability {
  public readonly stepActivitiesByKind: RuntimeStepActivityRegistry;

  private readonly pool: Pool;
  private readonly ownsPool: boolean;
  private readonly clientSession: PostgresAdapterClientSession;
  private readonly objectFileLoader: PostgresObjectFileLoader;
  private readonly nowIsoUtc: () => string;
  private readonly statementTimeoutMs: number;
  private readonly queryTimeoutMs: number;
  private readonly maxPlanClientSessions: number;
  private readonly planClientSessions = new Map<string, PlanClientSessionEntry>();

  constructor(private readonly config: PostgresRelationalExecutionCapabilityConfig) {
    const statementTimeoutMs =
      config.statementTimeoutMs ??
      Number(process.env[C.statementTimeoutEnvVar] ?? C.defaultTimeoutMs);
    const queryTimeoutMs =
      config.queryTimeoutMs ?? Number(process.env[C.queryTimeoutEnvVar] ?? C.defaultTimeoutMs);

    if (config.pool) {
      this.pool = config.pool;
      this.ownsPool = false;
    } else {
      const connectionString = resolvePostgresConnectionString(config.connectionString);
      this.pool = createObservedPostgresPool({
        connectionString,
        statement_timeout: statementTimeoutMs,
        query_timeout: queryTimeoutMs,
      });
      this.ownsPool = true;
    }

    this.clientSession = new PostgresAdapterClientSession(this.pool, statementTimeoutMs);
    this.objectFileLoader = new PostgresObjectFileLoader(this.clientSession);
    this.nowIsoUtc = config.nowIsoUtc ?? (() => new Date().toISOString());
    this.statementTimeoutMs = statementTimeoutMs;
    this.queryTimeoutMs = queryTimeoutMs;
    this.maxPlanClientSessions = parseMaxPlanClientSessions(config.maxPlanClientSessions);
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
    await Promise.all(
      [...this.planClientSessions.values()].map(({ clientSession }) => clientSession.close(true))
    );
    this.planClientSessions.clear();
  }

  public async load(input: PostgresObjectFileLoadInput): Promise<PostgresObjectFileLoadResult> {
    return this.objectFileLoader.load(input);
  }

  private async prepareTransform(
    step: ExecutionPlan['steps'][number],
    context: RuntimeStepExecutionContext
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
      await this.withPlanClientSession(step, context, (clientSession) =>
        clientSession.withClient((client) =>
          client.query(`CREATE SCHEMA IF NOT EXISTS ${quoteIdentifier(parsed.value.targetSchema)}`)
        )
      );
      return completedStepResult(step.stepId);
    } catch (error: unknown) {
      return failedPostgresOperation(step.stepId, FAILURE_REASON.prepareFailed, error);
    }
  }

  private async executeSqlTransform(
    step: ExecutionPlan['steps'][number],
    context: RuntimeStepExecutionContext
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
      await this.withPlanClientSession(step, context, (clientSession) =>
        clientSession.withTransaction(async (client) => {
          await client.query(`DROP TABLE IF EXISTS ${targetTable}`);
          await client.query(`CREATE TABLE ${targetTable} AS ${parsed.value.sql}`);
        })
      );
      return completedStepResult(step.stepId);
    } catch (error: unknown) {
      return failedPostgresOperation(step.stepId, FAILURE_REASON.transformFailed, error);
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
      const rowsWritten = await this.withPlanClientSession(step, context, (clientSession) =>
        clientSession.withClient(async (client) => {
          const result = await client.query<{ rows_written: string }>(
            `SELECT COUNT(*)::bigint AS rows_written FROM ${targetTable}`
          );
          return Number(result.rows[0]?.rows_written ?? 0);
        })
      );
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
      return failedPostgresOperation(step.stepId, FAILURE_REASON.captureFailed, error);
    }
  }

  private async withPlanClientSession<T>(
    step: ExecutionPlan['steps'][number],
    context: RuntimeStepExecutionContext,
    operation: (clientSession: PostgresAdapterClientSession) => Promise<T>
  ): Promise<T> {
    const entry = await this.acquirePlanClientSession(step, context);
    try {
      return await operation(entry.clientSession);
    } finally {
      entry.activeLeases -= 1;
      await this.evictIdlePlanClientSessions();
    }
  }

  private async acquirePlanClientSession(
    step: ExecutionPlan['steps'][number],
    context: RuntimeStepExecutionContext
  ): Promise<PlanClientSessionEntry> {
    if (this.config.planConnectionResolver === undefined) {
      throw new PostgresPlanConnectionRejectedError('POSTGRES_PLAN_CONNECTION_RESOLVER_REQUIRED');
    }

    const binding = await this.config.planConnectionResolver.resolveConnection(
      step,
      context.runContext
    );
    const key = buildPlanConnectionKey(binding);
    const existing = this.planClientSessions.get(key);
    if (existing !== undefined) {
      this.planClientSessions.delete(key);
      this.planClientSessions.set(key, existing);
      existing.activeLeases += 1;
      return existing;
    }

    const pool =
      this.config.planPoolFactory?.(binding) ??
      createObservedPostgresPool({
        connectionString: binding.connectionString,
        statement_timeout: this.statementTimeoutMs,
        query_timeout: this.queryTimeoutMs,
      });
    const entry: PlanClientSessionEntry = {
      clientSession: new PostgresAdapterClientSession(pool, this.statementTimeoutMs),
      activeLeases: 1,
    };
    this.planClientSessions.set(key, entry);
    await this.evictIdlePlanClientSessions();
    return entry;
  }

  private async evictIdlePlanClientSessions(): Promise<void> {
    while (this.planClientSessions.size > this.maxPlanClientSessions) {
      const candidate = [...this.planClientSessions].find(([, entry]) => entry.activeLeases === 0);
      if (candidate === undefined) {
        return;
      }

      const [key, entry] = candidate;
      this.planClientSessions.delete(key);
      await entry.clientSession.close(true);
    }
  }
}

function parseMaxPlanClientSessions(value: number | undefined): number {
  const resolved = value ?? DEFAULT_MAX_PLAN_CLIENT_SESSIONS;
  if (!Number.isSafeInteger(resolved) || resolved < 1) {
    throw new RangeError('maxPlanClientSessions must be a positive safe integer');
  }
  return resolved;
}

function parsePrepareTransformConfig(
  step: ExecutionPlan['steps'][number]
): { ok: true; value: PrepareTransformConfig } | { ok: false; error: string } {
  const parsed = PreparePostgresTransformStepTypeConfigSchema.safeParse(step.stepTypeConfig);
  if (!parsed.success) {
    return { ok: false, error: renderStepConfigError(parsed.error.issues) };
  }

  const targetSchema = normalizeIdentifier(parsed.data.targetSchema, 'targetSchema');
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
  const parsed = PostgresSqlTransformStepTypeConfigSchema.safeParse(step.stepTypeConfig);
  if (!parsed.success) {
    return { ok: false, error: renderStepConfigError(parsed.error.issues) };
  }

  const sql = normalizeNonBlankString(parsed.data.sql, 'sql');
  if (!sql.ok) return { ok: false, error: sql.error };

  const sink = parseRelationalSinkRef(parsed.data);
  if (!sink.ok) return { ok: false, error: sink.error };

  if (parsed.data.materialization !== 'table') {
    return { ok: false, error: 'materialization must be table' };
  }
  if (parsed.data.writeMode !== 'replace') {
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
  const parsed = CaptureMaterializationEvidenceStepTypeConfigSchema.safeParse(step.stepTypeConfig);
  if (!parsed.success) {
    return { ok: false, error: renderStepConfigError(parsed.error.issues) };
  }

  const sink = parseRelationalSinkRef(parsed.data);
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

function renderStepConfigError(
  issues: readonly { readonly path: PropertyKey[]; readonly message: string }[]
): string {
  return issues
    .map((issue) => `${issue.path.map(String).join('.') || 'stepTypeConfig'}: ${issue.message}`)
    .join('; ');
}

function failedPostgresOperation(
  stepId: string,
  defaultFailureReason: string,
  error: unknown
): RuntimeStepResult {
  if (error instanceof PostgresPlanConnectionRejectedError) {
    return failedStepResult(stepId, error.code, error.message, false);
  }
  return failedStepResult(
    stepId,
    defaultFailureReason,
    toErrorMessage(error),
    isTransientPostgresError(error)
  );
}

function buildPlanConnectionKey(binding: PostgresPlanConnection): string {
  return [
    binding.connectionRef.schemaVersion,
    binding.connectionRef.provider,
    binding.connectionRef.connectionId,
    binding.credentialRef,
  ].join(':');
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
