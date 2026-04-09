/**
 * @file packages/@dvt/adapter-postgres/src/PostgresRelationalExecutionCapability.ts
 * @baseline ADR-0003: Execution Model
 * @baseline ADR-0014: Run-driven adapter model
 * @decision Transformation execution remains capability-led: runtime dispatches StepKind and Postgres provides one relational SQL implementation
 * @consequence SQL-first plans can execute through governed Postgres step activities without hard-coding vendor logic into workflow control flow
 * @version 1.0.0
 * @date 2026-04-09
 */
import type { ExecutionPlan, MaterializationEvidence } from '@dvt/contracts';
import type { Pool } from 'pg';
import { Pool as PostgresPool } from 'pg';

import { PostgresAdapterClientSession } from './PostgresAdapterClientSession.js';
import { resolvePostgresConnectionString } from './PostgresAdapterConnectionString.js';
import { POSTGRES_ADAPTER_RUNTIME_CONSTANTS as C } from './PostgresAdapterConstants.js';
import { normalizeSchema, quoteIdentifier } from './sqlUtils.js';

export interface RuntimeStepExecutionContext {
  gatewayContext?: Record<string, unknown>;
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

interface PrepareTransformConfig {
  targetSchema: string;
}

interface SqlTransformConfig {
  sql: string;
  sinkSchema: string;
  sinkTable: string;
  materialization: 'table';
  writeMode: 'replace';
}

interface CaptureEvidenceConfig {
  environmentId: string;
  sinkSchema: string;
  sinkTable: string;
}

const FAILURE_REASON = Object.freeze({
  prepareConfigInvalid: 'POSTGRES_PREPARE_TRANSFORM_CONFIG_INVALID',
  prepareFailed: 'POSTGRES_PREPARE_TRANSFORM_ERROR',
  transformConfigInvalid: 'POSTGRES_SQL_TRANSFORM_CONFIG_INVALID',
  transformFailed: 'POSTGRES_SQL_TRANSFORM_ERROR',
  captureConfigInvalid: 'POSTGRES_CAPTURE_MATERIALIZATION_EVIDENCE_CONFIG_INVALID',
  captureFailed: 'POSTGRES_CAPTURE_MATERIALIZATION_EVIDENCE_ERROR',
});

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
      this.pool = new PostgresPool({
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
          execute: async (step) => this.prepareTransform(step),
        } satisfies RuntimeStepActivity,
      ],
      [
        'POSTGRES_SQL_TRANSFORM',
        {
          execute: async (step) => this.executeSqlTransform(step),
        } satisfies RuntimeStepActivity,
      ],
      [
        'CAPTURE_MATERIALIZATION_EVIDENCE',
        {
          execute: async (step) => this.captureMaterializationEvidence(step),
        } satisfies RuntimeStepActivity,
      ],
    ]);
  }

  async close(): Promise<void> {
    await this.clientSession.close(this.ownsPool);
  }

  private async prepareTransform(step: ExecutionPlan['steps'][number]): Promise<RuntimeStepResult> {
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
    step: ExecutionPlan['steps'][number]
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

    const targetTable = `${quoteIdentifier(parsed.value.sinkSchema)}.${quoteIdentifier(parsed.value.sinkTable)}`;

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
    step: ExecutionPlan['steps'][number]
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
    const targetTable = `${quoteIdentifier(parsed.value.sinkSchema)}.${quoteIdentifier(parsed.value.sinkTable)}`;

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
          environmentId: parsed.value.environmentId,
          sinkTable: `${parsed.value.sinkSchema}.${parsed.value.sinkTable}`,
          rowsWritten,
          startedAt,
          completedAt,
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

  const sinkSchema = normalizeIdentifier(stepTypeConfig['sinkSchema'], 'sinkSchema');
  if (!sinkSchema.ok) return { ok: false, error: sinkSchema.error };

  const sinkTable = normalizeIdentifier(stepTypeConfig['sinkTable'], 'sinkTable');
  if (!sinkTable.ok) return { ok: false, error: sinkTable.error };

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
      sinkSchema: sinkSchema.value,
      sinkTable: sinkTable.value,
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

  const environmentId = normalizeNonBlankString(stepTypeConfig['environmentId'], 'environmentId');
  if (!environmentId.ok) return { ok: false, error: environmentId.error };

  const sinkSchema = normalizeIdentifier(stepTypeConfig['sinkSchema'], 'sinkSchema');
  if (!sinkSchema.ok) return { ok: false, error: sinkSchema.error };

  const sinkTable = normalizeIdentifier(stepTypeConfig['sinkTable'], 'sinkTable');
  if (!sinkTable.ok) return { ok: false, error: sinkTable.error };

  return {
    ok: true,
    value: {
      environmentId: environmentId.value,
      sinkSchema: sinkSchema.value,
      sinkTable: sinkTable.value,
    },
  };
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
