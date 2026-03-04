/**
 * @file packages/@dvt/adapter-postgres/src/PostgresStartRunIntentStore.ts
 * @baseline ADR-0030: Pre-Dispatch Intent Log for startRun Crash Consistency
 * @baseline ADR-0031: Storage Adapter Tenant Isolation Strategy
 * @decision SQL-backed intent store with explicit status-transition guards
 * @consequence Intent reconciliation remains durable across process restarts
 * @version 1.0.0
 * @date 2026-03-04
 */
import type { EngineRunRef } from '@dvt/contracts';
import { Pool } from 'pg';

import { normalizeSchema, quoteIdentifier } from './sqlUtils.js';

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

type StartRunIntentStatus = 'PENDING' | 'DISPATCHED' | 'RESOLVED' | 'EXPIRED';

interface StartRunIntent {
  intentId: string;
  tenantId: string;
  runId: string;
  provider: EngineRunRef['provider'];
  status: StartRunIntentStatus;
  engineRunRef?: EngineRunRef;
  createdAt: string;
  updatedAt: string;
}

interface CreateIntentInput {
  intentId: string;
  tenantId: string;
  runId: string;
  provider: EngineRunRef['provider'];
  createdAt: string;
}

interface IStartRunIntentStore {
  createIntent(input: CreateIntentInput): Promise<StartRunIntent>;
  markDispatched(intentId: string, engineRunRef: EngineRunRef): Promise<void>;
  markResolved(intentId: string): Promise<void>;
  markExpired(intentId: string): Promise<void>;
  listOrphaned(thresholdMs: number, nowMs: number, limit?: number): Promise<StartRunIntent[]>;
  getIntent(intentId: string): Promise<StartRunIntent | null>;
}

export interface PostgresStartRunIntentStoreConfig {
  connectionString?: string;
  schema?: string;
  pool?: Pool;
  now?: () => string;
}

export class PostgresStartRunIntentStore implements IStartRunIntentStore {
  private readonly pool: Pool;
  private readonly ownsPool: boolean;
  private readonly schema: string;
  private readonly now: () => string;
  private migratePromise: Promise<void> | null = null;

  constructor(readonly config: PostgresStartRunIntentStoreConfig = {}) {
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
      });
      this.ownsPool = true;
    }
  }

  async migrate(): Promise<void> {
    if (!this.migratePromise) {
      this.migratePromise = this.ensureSchema().catch((error: unknown) => {
        this.migratePromise = null;
        throw error;
      });
    }
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
    await this.pool.query(
      `
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
      `,
      [input.intentId, input.tenantId, input.runId, input.provider, input.createdAt, now]
    );

    const intent = await this.getIntent(input.intentId);
    if (!intent) {
      throw new IntentNotFoundError(input.intentId);
    }
    return intent;
  }

  async markDispatched(
    intentId: string,
    engineRunRef: NonNullable<StartRunIntent['engineRunRef']>
  ): Promise<void> {
    this.ready();
    const result = await this.pool.query(
      `
        UPDATE ${quoteIdentifier(this.schema)}.start_run_intents
        SET status = 'DISPATCHED',
            engine_run_ref = $2::jsonb,
            updated_at = $3::timestamptz
        WHERE intent_id = $1 AND status = 'PENDING'
      `,
      [intentId, JSON.stringify(engineRunRef), this.now()]
    );
    await this.assertTransitionApplied(intentId, result.rowCount ?? 0, 'DISPATCHED');
  }

  async markResolved(intentId: string): Promise<void> {
    this.ready();
    const result = await this.pool.query(
      `
        UPDATE ${quoteIdentifier(this.schema)}.start_run_intents
        SET status = 'RESOLVED',
            updated_at = $2::timestamptz
        WHERE intent_id = $1 AND status IN ('PENDING', 'DISPATCHED')
      `,
      [intentId, this.now()]
    );
    await this.assertTransitionApplied(intentId, result.rowCount ?? 0, 'RESOLVED');
  }

  async markExpired(intentId: string): Promise<void> {
    this.ready();
    const result = await this.pool.query(
      `
        UPDATE ${quoteIdentifier(this.schema)}.start_run_intents
        SET status = 'EXPIRED',
            updated_at = $2::timestamptz
        WHERE intent_id = $1 AND status = 'PENDING'
      `,
      [intentId, this.now()]
    );
    await this.assertTransitionApplied(intentId, result.rowCount ?? 0, 'EXPIRED');
  }

  async listOrphaned(
    thresholdMs: number,
    nowMs: number,
    limit?: number
  ): Promise<StartRunIntent[]> {
    this.ready();
    const boundedLimit = Math.max(1, Math.min(limit ?? 100, 1000));
    const cutoffIso = new Date(nowMs - thresholdMs).toISOString();
    const result = await this.pool.query<IntentRow>(
      `
        SELECT
          intent_id,
          tenant_id,
          run_id,
          provider,
          status,
          engine_run_ref,
          created_at,
          updated_at
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
        SELECT
          intent_id,
          tenant_id,
          run_id,
          provider,
          status,
          engine_run_ref,
          created_at,
          updated_at
        FROM ${quoteIdentifier(this.schema)}.start_run_intents
        WHERE intent_id = $1
      `,
      [intentId]
    );
    const row = result.rows[0];
    return row ? toIntent(row) : null;
  }

  private async assertTransitionApplied(
    intentId: string,
    rowCount: number,
    to: StartRunIntentStatus
  ): Promise<void> {
    if (rowCount > 0) return;
    const existing = await this.getIntent(intentId);
    if (!existing) {
      throw new IntentNotFoundError(intentId);
    }
    throw new IntentInvalidTransitionError(intentId, existing.status, to);
  }

  private ready(): void {
    if (!this.migratePromise) {
      throw new Error('MIGRATE_NOT_CALLED: call await store.migrate() before using the store');
    }
  }

  private async ensureSchema(): Promise<void> {
    await this.pool.query(`CREATE SCHEMA IF NOT EXISTS ${quoteIdentifier(this.schema)}`);
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ${quoteIdentifier(this.schema)}.start_run_intents (
        intent_id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        run_id TEXT NOT NULL,
        provider TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING',
        engine_run_ref JSONB,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
      )
    `);
    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS intents_orphaned_idx
      ON ${quoteIdentifier(this.schema)}.start_run_intents (status, created_at ASC)
      WHERE status IN ('PENDING', 'DISPATCHED')
    `);
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

class IntentNotFoundError extends Error {
  readonly code = 'INTENT_NOT_FOUND';

  constructor(intentId: string) {
    super(`Start-run intent not found: ${intentId}`);
    this.name = 'IntentNotFoundError';
  }
}

class IntentInvalidTransitionError extends Error {
  readonly code = 'INTENT_INVALID_TRANSITION';

  constructor(intentId: string, from: string, to: string) {
    super(`Cannot transition intent ${intentId} from ${from} to ${to}`);
    this.name = 'IntentInvalidTransitionError';
  }
}
