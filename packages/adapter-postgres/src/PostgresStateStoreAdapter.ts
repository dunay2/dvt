import { Pool, type PoolClient } from 'pg';

import { normalizeSchema, quoteIdentifier } from './sqlUtils.js';
import type {
  AppendResult,
  ErrorMessage,
  EventInput,
  EventEnvelope,
  IOutboxStorage,
  IRunStateStore,
  OutboxId,
  OutboxRecord,
  RunBootstrapInput,
  RunMetadata,
  RunId,
  SchemaName,
} from './types.js';

interface RunMetadataRow {
  tenant_id: string;
  project_id: string;
  environment_id: string;
  run_id: string;
  plan_id: string;
  plan_version: string;
  provider: RunMetadata['provider'];
  provider_workflow_id: string;
  provider_run_id: string;
  provider_namespace: string | null;
  provider_task_queue: string | null;
  provider_conductor_url: string | null;
}

interface EventPayloadRow {
  payload: EventEnvelope;
}

interface OutboxRow {
  id: string;
  created_at: string;
  idempotency_key: string;
  payload: EventEnvelope;
  attempts: number;
  last_error: string | null;
}

interface MaxSeqRow {
  max_seq: number | string;
}

export interface PostgresAdapterConfig {
  connectionString?: string;
  schema?: SchemaName;
  pool?: Pool;
  now?: () => string;
}

/**
 * Foundation adapter for issue #6.
 *
 * SQL-backed implementation for run metadata, run events and outbox.
 *
 * - run metadata and event append are persisted in PostgreSQL
 * - idempotency is enforced by UNIQUE(run_id, idempotency_key)
 * - outbox entries are persisted with retry metadata
 */
export class PostgresStateStoreAdapter implements IRunStateStore, IOutboxStorage {
  private readonly pool: Pool;
  private readonly ownsPool: boolean;
  private readonly schema: SchemaName;
  private readonly now: () => string;
  private readonly initPromise: Promise<void>;

  constructor(readonly config: PostgresAdapterConfig = {}) {
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

    this.initPromise = this.ensureSchema();
  }

  async close(): Promise<void> {
    if (this.ownsPool) {
      await this.pool.end();
    }
  }

  async appendAndEnqueueTx(runId: RunId, envelopes: EventInput[]): Promise<AppendResult> {
    await this.ready();
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const append = await this.appendEventsTxWithClient(client, runId, envelopes);
      await this.enqueueTxWithClient(client, runId, append.appended);
      await client.query('COMMIT');
      return append;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async bootstrapRunTx(input: RunBootstrapInput): Promise<AppendResult> {
    await this.ready();
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await this.insertRunMetadataWithClient(client, input.metadata);
      const append = await this.appendEventsTxWithClient(
        client,
        input.metadata.runId,
        input.firstEvents
      );
      await this.enqueueTxWithClient(client, input.metadata.runId, append.appended);
      await client.query('COMMIT');
      return append;
    } catch (error: unknown) {
      await client.query('ROLLBACK');
      if (isUniqueViolation(error)) {
        const err = new Error('RUN_ALREADY_EXISTS');
        (err as Error & { cause?: unknown }).cause = error;
        throw err;
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async saveProviderRef(
    runId: RunId,
    runRef: {
      providerWorkflowId: string;
      providerRunId: string;
      providerNamespace?: string;
      providerTaskQueue?: string;
      providerConductorUrl?: string;
    }
  ): Promise<void> {
    await this.ready();
    await this.pool.query(
      `
        UPDATE ${quoteIdentifier(this.schema)}.run_metadata
        SET provider_workflow_id = $2,
            provider_run_id = $3,
            provider_namespace = $4,
            provider_task_queue = $5,
            provider_conductor_url = $6
        WHERE run_id = $1
      `,
      [
        runId,
        runRef.providerWorkflowId,
        runRef.providerRunId,
        runRef.providerNamespace ?? null,
        runRef.providerTaskQueue ?? null,
        runRef.providerConductorUrl ?? null,
      ]
    );
  }

  async saveRunMetadata(meta: RunMetadata): Promise<void> {
    await this.ready();
    await this.pool.query(
      `
        INSERT INTO ${quoteIdentifier(this.schema)}.run_metadata (
          run_id,
          tenant_id,
          project_id,
          environment_id,
          plan_id,
          plan_version,
          provider,
          provider_workflow_id,
          provider_run_id,
          provider_namespace,
          provider_task_queue,
          provider_conductor_url
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (run_id) DO UPDATE SET
          tenant_id = EXCLUDED.tenant_id,
          project_id = EXCLUDED.project_id,
          environment_id = EXCLUDED.environment_id,
          plan_id = EXCLUDED.plan_id,
          plan_version = EXCLUDED.plan_version,
          provider = EXCLUDED.provider,
          provider_workflow_id = EXCLUDED.provider_workflow_id,
          provider_run_id = EXCLUDED.provider_run_id,
          provider_namespace = EXCLUDED.provider_namespace,
          provider_task_queue = EXCLUDED.provider_task_queue,
          provider_conductor_url = EXCLUDED.provider_conductor_url
      `,
      [
        meta.runId,
        meta.tenantId,
        meta.projectId,
        meta.environmentId,
        meta.planId,
        meta.planVersion,
        meta.provider,
        meta.providerWorkflowId,
        meta.providerRunId,
        meta.providerNamespace ?? null,
        meta.providerTaskQueue ?? null,
        meta.providerConductorUrl ?? null,
      ]
    );
  }

  async getRunMetadataByRunId(runId: string): Promise<RunMetadata | null> {
    await this.ready();
    const result = await this.pool.query<RunMetadataRow>(
      `
        SELECT
          tenant_id,
          project_id,
          environment_id,
          run_id,
          plan_id,
          plan_version,
          provider,
          provider_workflow_id,
          provider_run_id,
          provider_namespace,
          provider_task_queue,
          provider_conductor_url
        FROM ${quoteIdentifier(this.schema)}.run_metadata
        WHERE run_id = $1
      `,
      [runId]
    );

    const row = result.rows[0];
    if (!row) return null;

    return {
      tenantId: row.tenant_id,
      projectId: row.project_id,
      environmentId: row.environment_id,
      runId: row.run_id,
      planId: row.plan_id,
      planVersion: row.plan_version,
      provider: row.provider,
      providerWorkflowId: row.provider_workflow_id,
      providerRunId: row.provider_run_id,
      providerNamespace: row.provider_namespace ?? undefined,
      providerTaskQueue: row.provider_task_queue ?? undefined,
      providerConductorUrl: row.provider_conductor_url ?? undefined,
    } as RunMetadata;
  }

  async appendEventsTx(runId: RunId, envelopes: EventInput[]): Promise<AppendResult> {
    await this.ready();
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await this.appendEventsTxWithClient(client, runId, envelopes);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async listEvents(runId: RunId): Promise<EventEnvelope[]> {
    await this.ready();
    const result = await this.pool.query<EventPayloadRow>(
      `
        SELECT payload
        FROM ${quoteIdentifier(this.schema)}.run_events
        WHERE run_id = $1
        ORDER BY run_seq ASC
      `,
      [runId]
    );

    return result.rows.map((row: EventPayloadRow) => row.payload as EventEnvelope);
  }

  async enqueueTx(runId: RunId, events: EventEnvelope[]): Promise<void> {
    await this.ready();
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await this.enqueueTxWithClient(client, runId, events);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async listPending(limit: number): Promise<OutboxRecord[]> {
    await this.ready();
    const boundedLimit = Math.max(0, limit);
    if (boundedLimit === 0) return [];

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const now = this.now();

      const result = await client.query<OutboxRow>(
        `
          WITH picked AS (
            SELECT id
            FROM ${quoteIdentifier(this.schema)}.outbox
            WHERE delivered_at IS NULL
              AND (claimed_at IS NULL OR claimed_at < ($2::timestamptz - INTERVAL '5 minutes'))
            ORDER BY created_at ASC
            LIMIT $1
            FOR UPDATE SKIP LOCKED
          ), claimed AS (
            UPDATE ${quoteIdentifier(this.schema)}.outbox o
            SET claimed_at = $2::timestamptz
            FROM picked
            WHERE o.id = picked.id
            RETURNING o.id, o.created_at, o.idempotency_key, o.payload, o.attempts, o.last_error
          )
          SELECT * FROM claimed
          ORDER BY created_at ASC
        `,
        [boundedLimit, now]
      );

      await client.query('COMMIT');

      return result.rows.map((row: OutboxRow) => ({
        id: row.id,
        createdAt: row.created_at,
        idempotencyKey: row.idempotency_key,
        payload: row.payload as EventEnvelope,
        attempts: Number(row.attempts),
        lastError: row.last_error ?? undefined,
      }));
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async markDelivered(ids: OutboxId[]): Promise<void> {
    await this.ready();
    if (ids.length === 0) return;

    await this.pool.query(
      `
        UPDATE ${quoteIdentifier(this.schema)}.outbox
        SET delivered_at = $2,
            claimed_at = NULL
        WHERE id = ANY($1::text[])
      `,
      [ids, this.now()]
    );
  }

  async markFailed(id: OutboxId, error: ErrorMessage): Promise<void> {
    await this.ready();
    await this.pool.query(
      `
        UPDATE ${quoteIdentifier(this.schema)}.outbox
        SET attempts = attempts + 1,
            last_error = $2,
            claimed_at = NULL
        WHERE id = $1
      `,
      [id, error]
    );
  }

  private async ready(): Promise<void> {
    await this.initPromise;
  }

  private async ensureSchema(): Promise<void> {
    await this.pool.query(`CREATE SCHEMA IF NOT EXISTS ${quoteIdentifier(this.schema)}`);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ${quoteIdentifier(this.schema)}.run_metadata (
        run_id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        environment_id TEXT NOT NULL,
        plan_id TEXT,
        plan_version TEXT,
        provider TEXT NOT NULL,
        provider_workflow_id TEXT NOT NULL,
        provider_run_id TEXT NOT NULL,
        provider_namespace TEXT,
        provider_task_queue TEXT,
        provider_conductor_url TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ${quoteIdentifier(this.schema)}.run_events (
        run_id TEXT NOT NULL,
        run_seq INTEGER NOT NULL,
        event_type TEXT NOT NULL,
        emitted_at TIMESTAMPTZ NOT NULL,
        tenant_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        environment_id TEXT NOT NULL,
        engine_attempt_id INTEGER NOT NULL,
        logical_attempt_id INTEGER NOT NULL,
        plan_id TEXT,
        plan_version TEXT,
        persisted_at TIMESTAMPTZ,
        step_id TEXT,
        idempotency_key TEXT NOT NULL,
        payload JSONB NOT NULL,
        PRIMARY KEY (run_id, run_seq),
        UNIQUE (run_id, idempotency_key)
      )
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ${quoteIdentifier(this.schema)}.outbox (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL,
        run_seq INTEGER NOT NULL,
        created_at TIMESTAMPTZ NOT NULL,
        idempotency_key TEXT NOT NULL,
        payload JSONB NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        last_error TEXT,
        claimed_at TIMESTAMPTZ,
        delivered_at TIMESTAMPTZ
      )
    `);

    await this.pool.query(`
      ALTER TABLE ${quoteIdentifier(this.schema)}.outbox
      ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ
    `);

    await this.pool.query(`
      ALTER TABLE ${quoteIdentifier(this.schema)}.run_metadata
      ADD COLUMN IF NOT EXISTS plan_id TEXT
    `);

    await this.pool.query(`
      ALTER TABLE ${quoteIdentifier(this.schema)}.run_metadata
      ADD COLUMN IF NOT EXISTS plan_version TEXT
    `);

    await this.pool.query(`
      ALTER TABLE ${quoteIdentifier(this.schema)}.run_events
      ADD COLUMN IF NOT EXISTS plan_id TEXT
    `);

    await this.pool.query(`
      ALTER TABLE ${quoteIdentifier(this.schema)}.run_events
      ADD COLUMN IF NOT EXISTS plan_version TEXT
    `);

    await this.pool.query(`
      ALTER TABLE ${quoteIdentifier(this.schema)}.run_events
      ADD COLUMN IF NOT EXISTS persisted_at TIMESTAMPTZ
    `);

    // Backward-compat cleanup for older schema revisions:
    // - drop redundant UNIQUE(run_id, run_seq) because id already encodes runId+runSeq
    await this.pool.query(`
      ALTER TABLE ${quoteIdentifier(this.schema)}.outbox
      DROP CONSTRAINT IF EXISTS outbox_run_id_run_seq_key
    `);

    // If an old pending index exists with outdated definition, recreate deterministically.
    await this.pool.query(
      `DROP INDEX IF EXISTS ${quoteIdentifier(this.schema)}.${quoteIdentifier('outbox_pending_idx')}`
    );

    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS outbox_pending_idx
      ON ${quoteIdentifier(this.schema)}.outbox (created_at, claimed_at)
      WHERE delivered_at IS NULL
    `);

    // Backward-compat cleanup for previously created redundant run_events index.
    await this.pool.query(
      `DROP INDEX IF EXISTS ${quoteIdentifier(this.schema)}.${quoteIdentifier('run_events_run_id_run_seq_idx')}`
    );
  }

  private async appendEventsTxWithClient(
    client: PoolClient,
    runId: RunId,
    envelopes: EventInput[]
  ): Promise<AppendResult> {
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [runId]);

    const seqResult = await client.query<MaxSeqRow>(
      `SELECT COALESCE(MAX(run_seq), 0) AS max_seq FROM ${quoteIdentifier(this.schema)}.run_events WHERE run_id = $1`,
      [runId]
    );

    let nextRunSeq = Number(seqResult.rows[0]?.max_seq ?? 0) + 1;
    const appended: EventEnvelope[] = [];
    const deduped: EventEnvelope[] = [];

    for (const envelope of envelopes) {
      const persistedAt = this.now();
      const withSeq: EventEnvelope = {
        ...envelope,
        runSeq: nextRunSeq,
        persistedAt,
      } as EventEnvelope;

      const inserted = await client.query<EventPayloadRow>(
        `
          INSERT INTO ${quoteIdentifier(this.schema)}.run_events (
            run_id,
            run_seq,
            event_type,
            emitted_at,
            tenant_id,
            project_id,
            environment_id,
            engine_attempt_id,
            logical_attempt_id,
            plan_id,
            plan_version,
            persisted_at,
            step_id,
            idempotency_key,
            payload
          )
          VALUES ($1, $2, $3, $4::timestamptz, $5, $6, $7, $8, $9, $10, $11, $12::timestamptz, $13, $14, $15::jsonb)
          ON CONFLICT (run_id, idempotency_key) DO NOTHING
          RETURNING payload
        `,
        [
          runId,
          nextRunSeq,
          withSeq.eventType,
          withSeq.emittedAt,
          withSeq.tenantId,
          withSeq.projectId,
          withSeq.environmentId,
          withSeq.engineAttemptId,
          withSeq.logicalAttemptId,
          withSeq.planId,
          withSeq.planVersion,
          withSeq.persistedAt,
          'stepId' in withSeq ? withSeq.stepId : null,
          withSeq.idempotencyKey,
          JSON.stringify(withSeq),
        ]
      );

      if (inserted.rowCount && inserted.rowCount > 0) {
        appended.push(withSeq);
        nextRunSeq += 1;
        continue;
      }

      const existing = await client.query<EventPayloadRow>(
        `
          SELECT payload
          FROM ${quoteIdentifier(this.schema)}.run_events
          WHERE run_id = $1 AND idempotency_key = $2
          LIMIT 1
        `,
        [runId, withSeq.idempotencyKey]
      );

      if (existing.rows[0]?.payload) {
        deduped.push(existing.rows[0].payload as EventEnvelope);
      }
    }

    return { appended, deduped };
  }

  private async insertRunMetadataWithClient(client: PoolClient, meta: RunMetadata): Promise<void> {
    await client.query(
      `
        INSERT INTO ${quoteIdentifier(this.schema)}.run_metadata (
          run_id,
          tenant_id,
          project_id,
          environment_id,
          plan_id,
          plan_version,
          provider,
          provider_workflow_id,
          provider_run_id,
          provider_namespace,
          provider_task_queue,
          provider_conductor_url
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `,
      [
        meta.runId,
        meta.tenantId,
        meta.projectId,
        meta.environmentId,
        meta.planId,
        meta.planVersion,
        meta.provider,
        meta.providerWorkflowId,
        meta.providerRunId,
        meta.providerNamespace ?? null,
        meta.providerTaskQueue ?? null,
        meta.providerConductorUrl ?? null,
      ]
    );
  }

  private async enqueueTxWithClient(
    client: PoolClient,
    runId: RunId,
    events: EventEnvelope[]
  ): Promise<void> {
    const createdAt = this.now();
    for (const event of events) {
      await client.query(
        `
          INSERT INTO ${quoteIdentifier(this.schema)}.outbox (
            id,
            run_id,
            run_seq,
            created_at,
            idempotency_key,
            payload,
            attempts
          )
          VALUES ($1, $2, $3, $4::timestamptz, $5, $6::jsonb, 0)
          ON CONFLICT (id) DO NOTHING
        `,
        [
          `${runId}:${event.runSeq}`,
          runId,
          event.runSeq,
          createdAt,
          event.idempotencyKey,
          JSON.stringify(event),
        ]
      );
    }
  }
}

function isUniqueViolation(error: unknown): error is { code: string } {
  return (
    typeof error === 'object' && error !== null && (error as { code?: string }).code === '23505'
  );
}
