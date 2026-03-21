import { createHash } from 'node:crypto';

import {
  type ExecutabilityValidationResult,
  type IPlanFetcher,
  type IPlanValidationLifecycleStore,
  type PlanRefSchemaT,
  type PlanValidationRecord,
  parsePlanRef,
  type PlannerBuildResultV2,
} from '@dvt/contracts';
import { Pool, type PoolClient } from 'pg';

import { normalizeSchema, quoteIdentifier } from './sqlUtils.js';

export interface ExecutablePlanArtifact {
  readonly text: string;
  readonly schemaVersion: string;
  readonly requiresCapabilities?: readonly string[];
}

export interface PostgresPlanStoreConfig {
  connectionString?: string;
  schema?: string;
  pool?: Pool;
  statementTimeoutMs?: number;
  queryTimeoutMs?: number;
  assumeSchemaReady?: boolean;
  toExecutablePlan: (buildResult: PlannerBuildResultV2) => ExecutablePlanArtifact;
}

type StoredPlanRow = {
  plan_id: string;
  plan_version: string;
  plan_uri: string;
  plan_sha256: string;
  schema_version: string;
  size_bytes: number;
  validation_state: 'PENDING_VALIDATION' | 'VALID' | 'INVALID';
  stored_at_iso: string;
  updated_at_iso: string;
  rejection_report_json: unknown;
};

const PLAN_URI_SCHEME = 'dvt-plan';

export class PostgresPlanStore implements IPlanValidationLifecycleStore, IPlanFetcher {
  private readonly pool: Pool;
  private readonly ownsPool: boolean;
  private readonly schema: string;
  private readonly statementTimeoutMs: number;

  public constructor(private readonly config: PostgresPlanStoreConfig) {
    this.schema = normalizeSchema(config.schema ?? 'dvt');
    this.statementTimeoutMs =
      config.statementTimeoutMs ?? Number(process.env['DVT_PG_STATEMENT_TIMEOUT_MS'] ?? 0);

    if (config.pool) {
      this.pool = config.pool;
      this.ownsPool = false;
    } else {
      this.pool = new Pool({
        connectionString:
          config.connectionString ??
          process.env['DVT_PG_URL'] ??
          process.env['DATABASE_URL'] ??
          'postgresql://dvt:dvt@localhost:5432/dvt',
        statement_timeout: this.statementTimeoutMs,
        query_timeout: config.queryTimeoutMs ?? Number(process.env['DVT_PG_QUERY_TIMEOUT_MS'] ?? 0),
      });
      this.ownsPool = true;
    }
  }

  public async migrate(): Promise<void> {
    await this.withTransaction(async (client) => {
      await client.query(`CREATE SCHEMA IF NOT EXISTS ${quoteIdentifier(this.schema)}`);
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${quoteIdentifier(this.schema)}.stored_plans (
          plan_id TEXT PRIMARY KEY,
          plan_version TEXT NOT NULL,
          plan_uri TEXT NOT NULL UNIQUE,
          plan_sha256 TEXT NOT NULL,
          schema_version TEXT NOT NULL,
          size_bytes INTEGER NOT NULL,
          requires_capabilities JSONB,
          canonical_plan_json TEXT NOT NULL,
          executable_plan_json TEXT NOT NULL,
          validation_state TEXT NOT NULL,
          rejection_report_json JSONB,
          stored_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS stored_plans_validation_state_idx
        ON ${quoteIdentifier(this.schema)}.stored_plans (validation_state, updated_at DESC)
      `);
    });
  }

  public async close(): Promise<void> {
    if (this.ownsPool) {
      await this.pool.end();
    }
  }

  public async storePlan(buildResult: PlannerBuildResultV2): Promise<PlanRefSchemaT> {
    const executable = this.config.toExecutablePlan(buildResult);
    const executableBytes = Buffer.from(executable.text, 'utf8');
    const planId = buildResult.plan.metadata.planId;
    const planRef = buildPlanRef({
      planId,
      planVersion: buildResult.plan.metadata.planVersion,
      schemaVersion: executable.schemaVersion,
      executableBytes,
      ...(executable.requiresCapabilities !== undefined
        ? { requiresCapabilities: executable.requiresCapabilities }
        : {}),
    });

    await this.withTransaction(async (client) => {
      await client.query(
        `
          INSERT INTO ${quoteIdentifier(this.schema)}.stored_plans (
            plan_id,
            plan_version,
            plan_uri,
            plan_sha256,
            schema_version,
            size_bytes,
            requires_capabilities,
            canonical_plan_json,
            executable_plan_json,
            validation_state,
            rejection_report_json,
            stored_at,
            updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, 'PENDING_VALIDATION', NULL, NOW(), NOW()
          )
          ON CONFLICT (plan_id) DO NOTHING
        `,
        [
          planId,
          planRef.planVersion,
          planRef.uri,
          planRef.sha256,
          planRef.schemaVersion,
          planRef.sizeBytes,
          JSON.stringify(planRef.requiresCapabilities ?? null),
          buildResult.canonicalPlanJson,
          executable.text,
        ]
      );
    });

    return planRef;
  }

  public async markValid(planRef: PlanRefSchemaT): Promise<void> {
    const validated = parsePlanRef(planRef);
    await this.transition(validated.planId, 'PENDING_VALIDATION', 'VALID', null);
  }

  public async markInvalid(
    planRef: PlanRefSchemaT,
    report: ExecutabilityValidationResult & { status: 'ERROR' }
  ): Promise<void> {
    const validated = parsePlanRef(planRef);
    await this.transition(validated.planId, 'PENDING_VALIDATION', 'INVALID', report);
  }

  public async getValidationRecord(planId: string): Promise<PlanValidationRecord | undefined> {
    const row = await this.withClient(async (client) => {
      const result = await client.query<StoredPlanRow>(
        `
          SELECT
            plan_id,
            plan_version,
            plan_uri,
            plan_sha256,
            schema_version,
            size_bytes,
            validation_state,
            stored_at::text AS stored_at_iso,
            updated_at::text AS updated_at_iso,
            rejection_report_json
          FROM ${quoteIdentifier(this.schema)}.stored_plans
          WHERE plan_id = $1
        `,
        [planId]
      );
      return result.rows[0];
    });

    if (!row) {
      return undefined;
    }

    return {
      planId: row.plan_id,
      state: row.validation_state,
      storedAtIso: row.stored_at_iso,
      updatedAtIso: row.updated_at_iso,
      ...(row.rejection_report_json !== null && row.rejection_report_json !== undefined
        ? {
            rejectionReport: row.rejection_report_json as ExecutabilityValidationResult & {
              status: 'ERROR';
            },
          }
        : {}),
    };
  }

  public async fetch(planRef: PlanRefSchemaT): Promise<Uint8Array> {
    const validated = parsePlanRef(planRef);
    return this.loadExecutablePlan(validated, ['VALID']);
  }

  public async fetchForValidation(planRef: PlanRefSchemaT): Promise<Uint8Array> {
    const validated = parsePlanRef(planRef);
    return this.loadExecutablePlan(validated, ['PENDING_VALIDATION', 'VALID']);
  }

  private async loadExecutablePlan(
    validated: PlanRefSchemaT,
    allowedStates: ReadonlyArray<'PENDING_VALIDATION' | 'VALID' | 'INVALID'>
  ): Promise<Uint8Array> {
    const row = await this.withClient(async (client) => {
      const result = await client.query<{
        executable_plan_json: string;
        validation_state: 'PENDING_VALIDATION' | 'VALID' | 'INVALID';
      }>(
        `
          SELECT executable_plan_json, validation_state
          FROM ${quoteIdentifier(this.schema)}.stored_plans
          WHERE plan_id = $1
        `,
        [validated.planId]
      );
      return result.rows[0];
    });

    if (!row) {
      throw new Error(`PLAN_NOT_FOUND: ${validated.planId}`);
    }
    if (!allowedStates.includes(row.validation_state)) {
      throw new Error(`PLAN_NOT_VALID: ${validated.planId}:${row.validation_state}`);
    }

    return Buffer.from(row.executable_plan_json, 'utf8');
  }

  private async transition(
    planId: string,
    expectedState: 'PENDING_VALIDATION',
    nextState: 'VALID' | 'INVALID',
    report: (ExecutabilityValidationResult & { status: 'ERROR' }) | null
  ): Promise<void> {
    await this.withTransaction(async (client) => {
      const current = await client.query<{ validation_state: string }>(
        `
          SELECT validation_state
          FROM ${quoteIdentifier(this.schema)}.stored_plans
          WHERE plan_id = $1
          FOR UPDATE
        `,
        [planId]
      );

      const state = current.rows[0]?.validation_state;
      if (!state) {
        throw new Error(`PLAN_NOT_FOUND: ${planId}`);
      }
      if (state !== expectedState) {
        throw new Error(
          `PLAN_VALIDATION_STATE_INVALID_TRANSITION: ${planId}:${state}->${nextState}`
        );
      }

      await client.query(
        `
          UPDATE ${quoteIdentifier(this.schema)}.stored_plans
          SET validation_state = $2,
              rejection_report_json = $3::jsonb,
              updated_at = NOW()
          WHERE plan_id = $1
        `,
        [planId, nextState, JSON.stringify(report)]
      );
    });
  }

  private async withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      if (this.statementTimeoutMs > 0) {
        await client.query('SET LOCAL statement_timeout = $1', [this.statementTimeoutMs]);
      }
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // ignore rollback failure
      }
      throw error;
    } finally {
      client.release();
    }
  }

  private async withClient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      if (this.statementTimeoutMs > 0) {
        await client.query('SET statement_timeout = $1', [this.statementTimeoutMs]);
      }
      return await fn(client);
    } finally {
      client.release();
    }
  }
}

function buildPlanRef(input: {
  planId: string;
  planVersion: string;
  schemaVersion: string;
  executableBytes: Uint8Array;
  requiresCapabilities?: readonly string[];
}): PlanRefSchemaT {
  const sha256 = createHash('sha256').update(input.executableBytes).digest('hex');
  return {
    uri: `${PLAN_URI_SCHEME}://postgres/${input.planId}`,
    sha256,
    schemaVersion: input.schemaVersion,
    planId: input.planId,
    planVersion: input.planVersion,
    sizeBytes: input.executableBytes.byteLength,
    ...(input.requiresCapabilities && input.requiresCapabilities.length > 0
      ? { requiresCapabilities: [...input.requiresCapabilities] }
      : {}),
  };
}
