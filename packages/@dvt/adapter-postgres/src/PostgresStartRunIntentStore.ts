/**
 * @file packages/@dvt/adapter-postgres/src/PostgresStartRunIntentStore.ts
 * @baseline ADR-0030: Pre-Dispatch Intent Log for startRun Crash Consistency
 * @baseline ADR-0031: Storage Adapter Tenant Isolation Strategy
 * @decision SQL-backed intent store with explicit status-transition guards
 * @consequence Intent reconciliation remains durable across process restarts
 * @version 1.0.0
 * @date 2026-03-04
 */
import type {
  CreateIntentInput,
  IStartRunIntentStore,
  StartRunIntentTransitionTarget,
  StartRunIntent,
  StartRunIntentStatus,
} from '@dvt/contracts';
import {
  getAllowedFromStatuses,
  IntentInvalidTransitionError,
  IntentNotFoundError,
  StoreNotReadyError,
} from '@dvt/contracts';
import { Pool } from 'pg';

import { normalizeSchema, quoteIdentifier } from './sqlUtils.js';
import { StartRunIntentSchemaManager } from './StartRunIntentSchemaManager.js';

interface IntentRow {
  intent_id: string;
  tenant_id: string;
  run_id: string;
  provider: StartRunIntent['provider'];
  status: StartRunIntentStatus;
  engine_run_ref: StartRunIntent['engineRunRef'] | null;
  created_at: string;
  updated_at: string;
}

type NonDispatchTransitionTarget = Exclude<StartRunIntentTransitionTarget, 'DISPATCHED'>;
type TransitionOutcome = 'UPDATED' | 'INVALID' | 'NOT_FOUND';

interface TransitionOutcomeRow {
  outcome: TransitionOutcome;
  current_status: StartRunIntentStatus | null;
}

const INTENT_SELECT_COLUMNS =
  'intent_id, tenant_id, run_id, provider, status, engine_run_ref, created_at, updated_at';

export interface PostgresStartRunIntentStoreConfig {
  connectionString?: string;
  schema?: string;
  pool?: Pool;
  now?: () => string;
  statementTimeoutMs?: number;
  queryTimeoutMs?: number;
  schemaManager?: StartRunIntentSchemaManager;
}

export class PostgresStartRunIntentStore implements IStartRunIntentStore {
  private readonly pool: Pool;
  private readonly ownsPool: boolean;
  private readonly schema: string;
  private readonly now: () => string;
  private readonly schemaManager: StartRunIntentSchemaManager;
  private migratePromise: Promise<void> | null = null;
  private migrated = false;

  constructor(config: PostgresStartRunIntentStoreConfig = {}) {
    this.schema = normalizeSchema(config.schema ?? 'dvt');
    this.now = config.now ?? (() => new Date().toISOString());

    if (config.pool) {
      this.pool = config.pool;
      this.ownsPool = false;
    } else {
      this.pool = new Pool({
        connectionString:
          config.connectionString ??
          process.env.DVT_PG_URL ??
          process.env.DATABASE_URL ??
          'postgresql://dvt:dvt@localhost:5432/dvt',
        statement_timeout:
          config.statementTimeoutMs ?? Number(process.env.DVT_PG_STATEMENT_TIMEOUT_MS ?? 0),
        query_timeout: config.queryTimeoutMs ?? Number(process.env.DVT_PG_QUERY_TIMEOUT_MS ?? 0),
      });
      this.ownsPool = true;
    }
    this.schemaManager =
      config.schemaManager ??
      new StartRunIntentSchemaManager({
        pool: this.pool,
        schema: this.schema,
      });
  }

  async migrate(): Promise<void> {
    this.migratePromise ??= this.schemaManager
      .migrate()
      .then(() => {
        this.migrated = true;
      })
      .catch((error: unknown) => {
        this.migratePromise = null;
        this.migrated = false;
        throw error;
      });
    return this.migratePromise;
  }

  async close(): Promise<void> {
    if (this.ownsPool) {
      await this.pool.end();
    }
  }

  async createIntent(input: CreateIntentInput): Promise<StartRunIntent> {
    this.ready();
    const now = this.now();
    const result = await this.pool.query<IntentRow>(
      `
        WITH inserted AS (
          INSERT INTO ${quoteIdentifier(this.schema)}.start_run_intents (
            intent_id,
            tenant_id,
            run_id,
            provider,
            status,
            engine_run_ref,
            created_at,
            updated_at
          )
          VALUES ($1, $2, $3, $4, 'PENDING', NULL, $5::timestamptz, $6::timestamptz)
          ON CONFLICT (intent_id) DO NOTHING
          RETURNING ${INTENT_SELECT_COLUMNS}
        )
        SELECT ${INTENT_SELECT_COLUMNS}
        FROM inserted
        UNION ALL
        SELECT ${INTENT_SELECT_COLUMNS}
        FROM ${quoteIdentifier(this.schema)}.start_run_intents
        WHERE intent_id = $1
          AND NOT EXISTS (SELECT 1 FROM inserted)
        LIMIT 1
      `,
      [input.intentId, input.tenantId, input.runId, input.provider, input.createdAt, now]
    );
    const row = result.rows[0];
    if (!row) {
      throw new IntentNotFoundError(input.intentId);
    }
    return toIntent(row);
  }

  async markDispatched(
    intentId: string,
    engineRunRef: NonNullable<StartRunIntent['engineRunRef']>
  ): Promise<void> {
    this.ready();
    const outcome = await this.resolveTransitionOutcome(
      `
        UPDATE ${quoteIdentifier(this.schema)}.start_run_intents
        SET status = 'DISPATCHED',
            engine_run_ref = $2::jsonb,
            updated_at = $3::timestamptz
        WHERE intent_id = $1
          AND status = 'PENDING'
        RETURNING status
      `,
      [intentId, JSON.stringify(engineRunRef), this.now()]
    );
    this.assertTransitionOutcome(intentId, outcome, 'DISPATCHED');
  }

  async markResolved(intentId: string): Promise<void> {
    await this.applyTransition(intentId, 'RESOLVED');
  }

  async markExpired(intentId: string): Promise<void> {
    await this.applyTransition(intentId, 'EXPIRED');
  }

  private async applyTransition(
    intentId: string,
    toStatus: NonDispatchTransitionTarget
  ): Promise<void> {
    this.ready();
    const allowedFrom = getAllowedFromStatuses(toStatus);
    const outcome = await this.resolveTransitionOutcome(
      `
        UPDATE ${quoteIdentifier(this.schema)}.start_run_intents
        SET status = $2,
            updated_at = $3::timestamptz
        WHERE intent_id = $1
          AND status::text = ANY($4::text[])
        RETURNING status
      `,
      [intentId, toStatus, this.now(), allowedFrom]
    );
    this.assertTransitionOutcome(intentId, outcome, toStatus);
  }

  async listOrphaned(
    thresholdMs: number,
    nowMs: number,
    limit?: number
  ): Promise<StartRunIntent[]> {
    this.ready();
    if (limit !== undefined && (limit < 1 || limit > 1000)) {
      throw new RangeError('INVALID_LIMIT: listOrphaned limit must be between 1 and 1000');
    }
    const boundedLimit = limit ?? 100;
    const cutoffIso = new Date(nowMs - thresholdMs).toISOString();
    const result = await this.pool.query<IntentRow>(
      `
        SELECT ${INTENT_SELECT_COLUMNS}
        FROM ${quoteIdentifier(this.schema)}.start_run_intents
        WHERE status IN ('PENDING', 'DISPATCHED')
          AND created_at < $1::timestamptz
        ORDER BY created_at ASC
        LIMIT $2
      `,
      [cutoffIso, boundedLimit]
    );
    return result.rows.map(toIntent);
  }

  async getIntent(intentId: string): Promise<StartRunIntent | null> {
    this.ready();
    const result = await this.pool.query<IntentRow>(
      `
        SELECT ${INTENT_SELECT_COLUMNS}
        FROM ${quoteIdentifier(this.schema)}.start_run_intents
        WHERE intent_id = $1
      `,
      [intentId]
    );
    const row = result.rows[0];
    return row ? toIntent(row) : null;
  }

  private async resolveTransitionOutcome(
    updateSql: string,
    updateParams: unknown[]
  ): Promise<TransitionOutcomeRow> {
    const result = await this.pool.query<TransitionOutcomeRow>(
      `
        WITH updated AS (
          ${updateSql}
        ),
        existing AS (
          SELECT status::text AS current_status
          FROM ${quoteIdentifier(this.schema)}.start_run_intents
          WHERE intent_id = $1
        )
        SELECT
          CASE
            WHEN EXISTS (SELECT 1 FROM updated) THEN 'UPDATED'
            WHEN EXISTS (SELECT 1 FROM existing) THEN 'INVALID'
            ELSE 'NOT_FOUND'
          END::text AS outcome,
          (SELECT current_status FROM existing LIMIT 1)::text AS current_status
      `,
      updateParams
    );
    return {
      outcome: (result.rows[0]?.outcome ?? 'NOT_FOUND') as TransitionOutcome,
      current_status: (result.rows[0]?.current_status ?? null) as StartRunIntentStatus | null,
    };
  }

  private assertTransitionOutcome(
    intentId: string,
    transition: TransitionOutcomeRow,
    to: StartRunIntentStatus
  ): void {
    if (transition.outcome === 'UPDATED') return;
    if (transition.outcome === 'NOT_FOUND') {
      throw new IntentNotFoundError(intentId);
    }
    throw new IntentInvalidTransitionError(intentId, transition.current_status ?? 'UNKNOWN', to);
  }

  private ready(): void {
    if (!this.migrated) {
      throw new StoreNotReadyError(
        'MIGRATE_NOT_READY: call and await store.migrate() before using the store'
      );
    }
  }
}

function toIntent(row: IntentRow): StartRunIntent {
  return {
    intentId: row.intent_id,
    tenantId: row.tenant_id,
    runId: row.run_id,
    provider: row.provider,
    status: row.status,
    engineRunRef: row.engine_run_ref ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
