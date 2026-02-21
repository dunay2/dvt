import { Pool, type PoolClient } from 'pg';

import { normalizeSchema, quoteIdentifier } from './sqlUtils.js';
import type {
  AppendResult,
  DeadLetterRecord,
  ErrorMessage,
  EventInput,
  EventEnvelope,
  IOutboxStorage,
  IRunStateStore,
  ListRunsOptions,
  OutboxId,
  OutboxRecord,
  RunBootstrapInput,
  RunMetadata,
  RunId,
  SchemaName,
  StepSnapshot,
  WorkflowSnapshot,
} from './types.js';
import { MAX_OUTBOX_ATTEMPTS } from './types.js';

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

interface SnapshotRow {
  snapshot: WorkflowSnapshot;
}

interface DeadLetterRow {
  id: string;
  original_id: string;
  run_id: string;
  payload: EventEnvelope;
  last_error: string;
  dead_lettered_at: string;
}

interface MarkFailedRow {
  attempts: number;
  payload: EventEnvelope;
  run_id: string;
}

/**
 * Pure local apply function — mirrors engine's applyRunEvent without creating
 * a cross-package source dependency. Both implementations must be kept in sync
 * whenever a new EventType is added to the catalog.
 */
function applyEventToSnapshot(snap: WorkflowSnapshot, e: EventEnvelope): void {
  switch (e.eventType) {
    case 'RunQueued':
      handleRunQueued(snap, e);
      break;
    case 'RunStarted':
      handleRunStarted(snap, e);
      break;
    case 'RunPaused':
      handleRunPaused(snap, e);
      break;
    case 'RunResumed':
      handleRunResumed(snap, e);
      break;
    case 'RunCancelled':
      handleRunCancelled(snap, e);
      break;
    case 'RunCompleted':
      handleRunCompleted(snap, e);
      break;
    case 'RunFailed':
      handleRunFailed(snap, e);
      break;
    case 'StepStarted':
      handleStepStarted(snap, e);
      break;
    case 'StepCompleted':
      handleStepCompleted(snap, e);
      break;
    case 'StepFailed':
      handleStepFailed(snap, e);
      break;
    case 'StepSkipped':
      handleStepSkipped(snap, e);
      break;
    default:
      // Forward-compatibility: unknown event types do not mutate snapshot.
      break;
  }
}

function handleRunQueued(_snap: WorkflowSnapshot, _e: EventEnvelope): void {
  // No-op for RunQueued
}

function handleRunStarted(snap: WorkflowSnapshot, e: EventEnvelope): void {
  snap.status = 'RUNNING';
  snap.startedAt = snap.startedAt ?? e.emittedAt;
}

function handleRunPaused(snap: WorkflowSnapshot, _e: EventEnvelope): void {
  snap.status = 'PAUSED';
  snap.paused = true;
}

function handleRunResumed(snap: WorkflowSnapshot, _e: EventEnvelope): void {
  snap.status = 'RUNNING';
  snap.paused = false;
}

function handleRunCancelled(snap: WorkflowSnapshot, e: EventEnvelope): void {
  snap.status = 'CANCELLED';
  snap.completedAt = e.emittedAt;
}

function handleRunCompleted(snap: WorkflowSnapshot, e: EventEnvelope): void {
  snap.status = 'COMPLETED';
  snap.completedAt = e.emittedAt;
}

function handleRunFailed(snap: WorkflowSnapshot, e: EventEnvelope): void {
  snap.status = 'FAILED';
  snap.completedAt = e.emittedAt;
}

function handleStepStarted(snap: WorkflowSnapshot, e: EventEnvelope): void {
  const stepId = (e as { stepId: string }).stepId;
  const s: StepSnapshot = snap.steps[stepId] ?? { status: 'PENDING', attempts: 0 };
  s.status = 'RUNNING';
  s.startedAt = s.startedAt ?? e.emittedAt;
  s.attempts += 1;
  snap.steps[stepId] = s;
}

function handleStepCompleted(snap: WorkflowSnapshot, e: EventEnvelope): void {
  const stepId = (e as { stepId: string }).stepId;
  const s: StepSnapshot = snap.steps[stepId] ?? { status: 'PENDING', attempts: 0 };
  s.status = 'COMPLETED';
  s.completedAt = e.emittedAt;
  snap.steps[stepId] = s;
}

function handleStepFailed(snap: WorkflowSnapshot, e: EventEnvelope): void {
  const stepId = (e as { stepId: string }).stepId;
  const s: StepSnapshot = snap.steps[stepId] ?? { status: 'PENDING', attempts: 0 };
  s.status = 'FAILED';
  s.completedAt = e.emittedAt;
  snap.steps[stepId] = s;
}

function handleStepSkipped(snap: WorkflowSnapshot, e: EventEnvelope): void {
  const stepId = (e as { stepId: string }).stepId;
  const s: StepSnapshot = snap.steps[stepId] ?? { status: 'PENDING', attempts: 0 };
  s.status = 'SKIPPED';
  s.completedAt = e.emittedAt;
  snap.steps[stepId] = s;
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
  /** Deduplicated promise for concurrent migrate() callers. */
  private migratePromise: Promise<void> | null = null;

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
    // DDL is no longer run at construction time.
    // Callers MUST await adapter.migrate() before using any storage methods.
  }

  /**
   * Runs all DDL migrations required for this adapter (CREATE TABLE IF NOT EXISTS, etc.).
   *
   * Must be called — and awaited — once before the adapter is used.
   * Safe to call multiple times: subsequent calls are no-ops (idempotent).
   *
   * Separating DDL from the constructor allows the adapter to be instantiated in
   * IAM-restricted environments where the runtime role has no DDL privileges, and
   * migrations are run as a separate privileged step.
   */
  async migrate(): Promise<void> {
    if (!this.migratePromise) {
      this.migratePromise = this.ensureSchema();
    }
    return this.migratePromise;
  }

  /**
   * Sets `dvt.tenant_id` as a transaction-local Postgres config parameter.
   *
   * Must be called at the start of a transaction (after BEGIN) when Row Level
   * Security (migration 005) is active. The setting is automatically reset at
   * transaction end — it never leaks to subsequent transactions on the same
   * connection.
   *
   * ```ts
   * const client = await pool.connect();
   * await client.query('BEGIN');
   * await PostgresStateStoreAdapter.setTenantContext(client, tenantId);
   * // … tenant-scoped queries …
   * await client.query('COMMIT');
   * client.release();
   * ```
   */
  static async setTenantContext(client: PoolClient, tenantId: string): Promise<void> {
    await client.query(`SELECT set_config('dvt.tenant_id', $1, true)`, [tenantId]);
  }

  async close(): Promise<void> {
    if (this.ownsPool) {
      await this.pool.end();
    }
  }

  async appendAndEnqueueTx(runId: RunId, envelopes: EventInput[]): Promise<AppendResult> {
    this.ready();
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
    this.ready();
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
    this.ready();
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

  /**
   * @deprecated Use bootstrapRunTx. This upsert bypasses the atomic
   * metadata + first-event + snapshot guarantee and may cause
   * IRunStateStore.getSnapshot to return null for the run. Scheduled for
   * removal in Phase 3.
   */
  async saveRunMetadata(meta: RunMetadata): Promise<void> {
    this.ready();
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
    this.ready();
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

  async listRuns(options?: ListRunsOptions): Promise<RunMetadata[]> {
    this.ready();
    const limit = Math.min(options?.limit ?? 50, 500);
    const params: unknown[] = [limit];
    const tenantFilter = options?.tenantId ? `WHERE tenant_id = $2` : '';
    if (options?.tenantId) params.push(options.tenantId);

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
        ${tenantFilter}
        ORDER BY created_at DESC
        LIMIT $1
      `,
      params
    );

    return result.rows.map((row) => ({
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
    })) as RunMetadata[];
  }

  /**
   * @deprecated Use appendAndEnqueueTx. Unlike appendAndEnqueueTx, this method
   * appends events WITHOUT writing outbox records, so they will never be
   * delivered to subscribers. Scheduled for removal in Phase 3.
   */
  async appendEventsTx(runId: RunId, envelopes: EventInput[]): Promise<AppendResult> {
    this.ready();
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
    this.ready();
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

  async getSnapshot(runId: RunId): Promise<WorkflowSnapshot | null> {
    this.ready();
    const result = await this.pool.query<SnapshotRow>(
      `SELECT snapshot FROM ${quoteIdentifier(this.schema)}.run_snapshots WHERE run_id = $1`,
      [runId]
    );
    return result.rows[0]?.snapshot ?? null;
  }

  async enqueueTx(runId: RunId, events: EventEnvelope[]): Promise<void> {
    this.ready();
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
    this.ready();
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
    this.ready();
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
    this.ready();
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query<MarkFailedRow>(
        `
          UPDATE ${quoteIdentifier(this.schema)}.outbox
          SET attempts = attempts + 1,
              last_error = $2,
              claimed_at = NULL
          WHERE id = $1
          RETURNING attempts, payload, run_id
        `,
        [id, error]
      );

      const row = result.rows[0];
      if (row && row.attempts >= MAX_OUTBOX_ATTEMPTS) {
        await client.query(
          `
            INSERT INTO ${quoteIdentifier(this.schema)}.outbox_dead_letter
              (id, original_id, run_id, payload, last_error, dead_lettered_at)
            VALUES ($1, $2, $3, $4::jsonb, $5, $6::timestamptz)
            ON CONFLICT (id) DO NOTHING
          `,
          [`dl_${id}`, id, row.run_id, JSON.stringify(row.payload), error, this.now()]
        );
        await client.query(`DELETE FROM ${quoteIdentifier(this.schema)}.outbox WHERE id = $1`, [
          id,
        ]);
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async listDeadLetter(limit: number): Promise<DeadLetterRecord[]> {
    this.ready();
    const boundedLimit = Math.max(0, limit);
    if (boundedLimit === 0) return [];

    const result = await this.pool.query<DeadLetterRow>(
      `
        SELECT id, original_id, run_id, payload, last_error, dead_lettered_at
        FROM ${quoteIdentifier(this.schema)}.outbox_dead_letter
        ORDER BY dead_lettered_at DESC
        LIMIT $1
      `,
      [boundedLimit]
    );

    return result.rows.map((row) => ({
      id: row.id,
      originalId: row.original_id,
      runId: row.run_id,
      payload: row.payload as EventEnvelope,
      lastError: row.last_error,
      deadLetteredAt: row.dead_lettered_at,
    }));
  }

  private ready(): void {
    if (!this.migratePromise) {
      throw new Error('MIGRATE_NOT_CALLED: call await adapter.migrate() before using the adapter');
    }
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

    // Materialized snapshot table: O(1) read path for getRunStatus.
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ${quoteIdentifier(this.schema)}.run_snapshots (
        run_id TEXT PRIMARY KEY,
        snapshot JSONB NOT NULL,
        last_run_seq INTEGER NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
      )
    `);

    // Dead-letter table for outbox records that exceeded MAX_OUTBOX_ATTEMPTS.
    // Records here are never retried automatically; use manual replay tooling.
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ${quoteIdentifier(this.schema)}.outbox_dead_letter (
        id TEXT PRIMARY KEY,
        original_id TEXT NOT NULL,
        run_id TEXT NOT NULL,
        payload JSONB NOT NULL,
        last_error TEXT NOT NULL,
        dead_lettered_at TIMESTAMPTZ NOT NULL
      )
    `);

    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS outbox_dead_letter_run_id_idx
      ON ${quoteIdentifier(this.schema)}.outbox_dead_letter (run_id)
    `);
  }

  private async appendEventsTxWithClient(
    client: PoolClient,
    runId: RunId,
    envelopes: EventInput[]
  ): Promise<AppendResult> {
    // Use 64-bit MD5-derived lock key to avoid hashtext()'s 32-bit collision space.
    // Birthday bound is now ~2^32 rather than ~2^16 concurrent distinct runIds.
    await client.query(
      `SELECT pg_advisory_xact_lock(('x' || left(md5($1), 16))::bit(64)::bigint)`,
      [runId]
    );

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

    // Upsert materialized snapshot within the same transaction (O(1) read path).
    if (appended.length > 0) {
      const currentSnap = await client.query<SnapshotRow>(
        `SELECT snapshot FROM ${quoteIdentifier(this.schema)}.run_snapshots WHERE run_id = $1`,
        [runId]
      );
      const snap: WorkflowSnapshot = currentSnap.rows[0]?.snapshot ?? {
        runId,
        status: 'PENDING',
        paused: false,
        steps: {},
      };
      for (const e of appended) {
        applyEventToSnapshot(snap, e);
      }
      await client.query(
        `
          INSERT INTO ${quoteIdentifier(this.schema)}.run_snapshots (run_id, snapshot, last_run_seq, updated_at)
          VALUES ($1, $2::jsonb, $3, $4::timestamptz)
          ON CONFLICT (run_id) DO UPDATE SET
            snapshot = EXCLUDED.snapshot,
            last_run_seq = EXCLUDED.last_run_seq,
            updated_at = EXCLUDED.updated_at
        `,
        [runId, JSON.stringify(snap), appended[appended.length - 1]!.runSeq, this.now()]
      );
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
