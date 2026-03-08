/**
 * @file packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts
 * @baseline ADR-0004: Event Sourcing Strategy (Extended)
 * @baseline ADR-0003: Execution Model
 * @baseline ADR-0031: Storage Adapter Tenant Isolation Strategy
 * @decision Section 2.1 — Append-only event persistence with monotonic sequence semantics
 * @decision Section 2.2 — Read model snapshot projection derived from persisted event stream
 * @decision All adapter methods enforce tenant scope per ADR-0031
 * @consequence PostgreSQL adapter preserves deterministic replay and transactional state consistency
 * @consequence Cross-tenant reads/writes are blocked at the adapter boundary
 * @version 1.0.0
 * @date 2026-02-21
 */
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
  ListEventsOptions,
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

const RUN_METADATA_COLUMNS = `
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
`;

function toRunMetadata(row: RunMetadataRow): RunMetadata {
  return {
    tenantId: row.tenant_id,
    projectId: row.project_id,
    environmentId: row.environment_id,
    runId: row.run_id,
    planId: row.plan_id,
    planVersion: row.plan_version,
    // Phase 1: column not yet in schema. Phase 2: read from row.logical_attempt_id.
    logicalAttemptId: 1,
    provider: row.provider,
    providerWorkflowId: row.provider_workflow_id,
    providerRunId: row.provider_run_id,
    providerNamespace: row.provider_namespace ?? undefined,
    providerTaskQueue: row.provider_task_queue ?? undefined,
    providerConductorUrl: row.provider_conductor_url ?? undefined,
  } as RunMetadata;
}

/**
 * Handler registry for event type mutations.
 * Pure local apply function — mirrors engine's applyRunEvent without creating
 * a cross-package source dependency. Both implementations must be kept in sync
 * whenever a new EventType is added to the catalog.
 */
const EVENT_HANDLERS: Record<string, (snap: WorkflowSnapshot, e: EventEnvelope) => void> = {
  RunQueued: handleRunQueued,
  RunStarted: handleRunStarted,
  RunPaused: handleRunPaused,
  RunResumed: handleRunResumed,
  RunCancelRequested: handleRunCancelRequested,
  RunCancelled: handleRunCancelled,
  RunCompleted: handleRunCompleted,
  RunFailed: handleRunFailed,
  StepStarted: handleStepStarted,
  StepCompleted: handleStepCompleted,
  StepFailed: handleStepFailed,
  StepSkipped: handleStepSkipped,
};

function applyEventToSnapshot(snap: WorkflowSnapshot, e: EventEnvelope): void {
  const handler = EVENT_HANDLERS[e.eventType];
  if (handler) {
    handler(snap, e);
  }
  // Forward-compatibility: unknown event types do not mutate snapshot.
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

function handleRunCancelRequested(snap: WorkflowSnapshot): void {
  snap.cancelling = true;
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

  const payload = e.payload;
  if (payload && typeof payload === 'object') {
    const maybeDecision =
      typeof payload === 'object' && payload !== null && 'gatewayDecision' in payload
        ? (payload as { gatewayDecision?: unknown }).gatewayDecision
        : undefined;
    if (typeof maybeDecision === 'boolean') {
      snap.gatewayDecisions ??= {};
      snap.gatewayDecisions[stepId] = maybeDecision;
    }
  }
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
  statementTimeoutMs?: number;
  queryTimeoutMs?: number;
  assumeSchemaReady?: boolean;
}

/**
 * Foundation adapter for issue #6 (Postgres state store implementation).

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
  private readonly statementTimeoutMs: number;
  /** Deduplicated promise for concurrent migrate() callers. */
  private migratePromise: Promise<void> | null = null;
  private migrated = false;

  constructor(readonly config: PostgresAdapterConfig = {}) {
    this.schema = normalizeSchema(config.schema ?? 'dvt');
    this.now = config.now ?? (() => new Date().toISOString());
    this.statementTimeoutMs =
      config.statementTimeoutMs ?? Number(process.env.DVT_PG_STATEMENT_TIMEOUT_MS ?? 0);

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
        statement_timeout: this.statementTimeoutMs,
        query_timeout: config.queryTimeoutMs ?? Number(process.env.DVT_PG_QUERY_TIMEOUT_MS ?? 0),
      });
      this.ownsPool = true;
    }
    if (config.assumeSchemaReady) {
      this.migratePromise = Promise.resolve();
      this.migrated = true;
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
    this.migratePromise ??= this.ensureSchema().catch((error: unknown) => {
      // Allow retry if migration fails once (transient DB/network issue).
      this.migratePromise = null;
      this.migrated = false;
      throw error;
    });
    await this.migratePromise;
    this.migrated = true;
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
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async resolveAndSetTenantContext(client: PoolClient, runId: RunId): Promise<string> {
    const tenantId = await this.resolveRunTenantWithClient(client, runId);
    await PostgresStateStoreAdapter.setTenantContext(client, tenantId);
    return tenantId;
  }

  async appendAndEnqueueTx(runId: RunId, envelopes: EventInput[]): Promise<AppendResult> {
    this.ready();
    return this.withTransaction(async (client) => {
      await this.resolveAndSetTenantContext(client, runId);
      const append = await this.appendEventsTxWithClient(client, runId, envelopes);
      await this.enqueueTxWithClient(client, runId, append.appended);
      return append;
    });
  }

  async bootstrapRunTx(input: RunBootstrapInput): Promise<AppendResult> {
    this.ready();
    try {
      return await this.withTransaction(async (client) => {
        await PostgresStateStoreAdapter.setTenantContext(client, input.metadata.tenantId);
        await this.insertRunMetadataWithClient(client, input.metadata);
        const append = await this.appendEventsTxWithClient(
          client,
          input.metadata.runId as RunId,
          input.firstEvents
        );
        await this.enqueueTxWithClient(client, input.metadata.runId as RunId, append.appended);
        return append;
      });
    } catch (error: unknown) {
      if (isUniqueViolation(error)) {
        const err = new Error('RUN_ALREADY_EXISTS');
        (err as Error & { cause?: unknown }).cause = error;
        throw err;
      }
      throw error;
    }
  }

  async saveProviderRef(
    tenantId: string,
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
    const result = await this.pool.query(
      `
        UPDATE ${quoteIdentifier(this.schema)}.run_metadata
        SET provider_workflow_id = $2,
            provider_run_id = $3,
            provider_namespace = $4,
            provider_task_queue = $5,
            provider_conductor_url = $6
        WHERE run_id = $1 AND tenant_id = $7
      `,
      [
        runId,
        runRef.providerWorkflowId,
        runRef.providerRunId,
        runRef.providerNamespace ?? null,
        runRef.providerTaskQueue ?? null,
        runRef.providerConductorUrl ?? null,
        tenantId,
      ]
    );
    if (!result.rowCount) {
      throw new Error(`RUN_NOT_FOUND_OR_FORBIDDEN: ${runId}`);
    }
  }

  /**
   * @deprecated Use bootstrapRunTx. This upsert bypasses the atomic
   * metadata + first-event + snapshot guarantee and may cause
   * IRunStateStore.getSnapshot to return null for the run. Scheduled for
   * removal in Phase 3.
   */
  async saveRunMetadata(meta: RunMetadata): Promise<void> {
    this.ready();
    await this.withTransaction(async (client) => {
      await PostgresStateStoreAdapter.setTenantContext(client, meta.tenantId);

      const existing = await client.query<{ tenant_id: string }>(
        `
          SELECT tenant_id
          FROM ${quoteIdentifier(this.schema)}.run_metadata
          WHERE run_id = $1
          LIMIT 1
          FOR UPDATE
        `,
        [meta.runId]
      );
      const existingTenantId = existing.rows[0]?.tenant_id;
      if (existingTenantId && existingTenantId !== meta.tenantId) {
        throw new Error(`TENANT_SCOPE_VIOLATION: ${meta.runId}`);
      }

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
    });
  }

  async getRunMetadataByRunId(tenantId: string, runId: string): Promise<RunMetadata | null> {
    this.ready();
    const result = await this.pool.query<RunMetadataRow>(
      `
        SELECT ${RUN_METADATA_COLUMNS}
        FROM ${quoteIdentifier(this.schema)}.run_metadata
        WHERE tenant_id = $1 AND run_id = $2
      `,
      [tenantId, runId]
    );

    const row = result.rows[0];
    if (!row) return null;

    return toRunMetadata(row);
  }

  async listRuns(options: ListRunsOptions): Promise<RunMetadata[]> {
    this.ready();
    const limit = Math.min(options.limit ?? 50, 500);
    const params: unknown[] = [limit, options.tenantId];

    if (options.status === undefined) {
      const result = await this.pool.query<RunMetadataRow>(
        `
          SELECT ${RUN_METADATA_COLUMNS}
          FROM ${quoteIdentifier(this.schema)}.run_metadata
          WHERE tenant_id = $2
          ORDER BY created_at DESC
          LIMIT $1
        `,
        params
      );
      return result.rows.map(toRunMetadata);
    }

    params.push(options.status);
    const statusParam = `$${params.length}`;
    const result = await this.pool.query<RunMetadataRow>(
      `
        SELECT
          m.tenant_id,
          m.project_id,
          m.environment_id,
          m.run_id,
          m.plan_id,
          m.plan_version,
          m.provider,
          m.provider_workflow_id,
          m.provider_run_id,
          m.provider_namespace,
          m.provider_task_queue,
          m.provider_conductor_url
        FROM ${quoteIdentifier(this.schema)}.run_metadata m
        INNER JOIN ${quoteIdentifier(this.schema)}.run_snapshots s ON s.run_id = m.run_id
        WHERE m.tenant_id = $2
          AND s.snapshot->>'status' = ${statusParam}
        ORDER BY m.created_at DESC
        LIMIT $1
      `,
      params
    );
    return result.rows.map(toRunMetadata);
  }

  /**
   * @deprecated Use appendAndEnqueueTx. Unlike appendAndEnqueueTx, this method
   * appends events WITHOUT writing outbox records, so they will never be
   * delivered to subscribers. Scheduled for removal in Phase 3.
   */
  async appendEventsTx(runId: RunId, envelopes: EventInput[]): Promise<AppendResult> {
    this.ready();
    return this.withTransaction(async (client) => {
      await this.resolveAndSetTenantContext(client, runId);
      return this.appendEventsTxWithClient(client, runId, envelopes);
    });
  }

  async listEvents(
    tenantId: string,
    runId: string,
    options?: ListEventsOptions
  ): Promise<EventEnvelope[]> {
    this.ready();
    const params: unknown[] = [tenantId, runId];
    let afterSeqClause = '';
    let limitClause = '';

    if (options?.afterSeq !== undefined) {
      params.push(options.afterSeq);
      afterSeqClause = `AND run_seq > $${params.length}`;
    }
    if (options?.limit !== undefined) {
      params.push(Math.max(1, options.limit));
      limitClause = `LIMIT $${params.length}`;
    }

    const result = await this.pool.query<EventPayloadRow>(
      `
        SELECT payload
        FROM ${quoteIdentifier(this.schema)}.run_events
        WHERE tenant_id = $1 AND run_id = $2
        ${afterSeqClause}
        ORDER BY run_seq ASC
        ${limitClause}
      `,
      params
    );

    return result.rows.map((row: EventPayloadRow) => row.payload);
  }

  async getSnapshot(tenantId: string, runId: RunId): Promise<WorkflowSnapshot | null> {
    this.ready();
    const result = await this.pool.query<SnapshotRow>(
      `
        SELECT s.snapshot
        FROM ${quoteIdentifier(this.schema)}.run_snapshots s
        INNER JOIN ${quoteIdentifier(this.schema)}.run_metadata m ON m.run_id = s.run_id
        WHERE m.tenant_id = $1 AND s.run_id = $2
      `,
      [tenantId, runId]
    );
    return result.rows[0]?.snapshot ?? null;
  }

  async enqueueTx(runId: RunId, events: EventEnvelope[]): Promise<void> {
    this.ready();
    await this.withTransaction(async (client) => {
      await this.resolveAndSetTenantContext(client, runId);
      await this.enqueueTxWithClient(client, runId, events);
    });
  }

  async listPending(limit: number): Promise<OutboxRecord[]> {
    this.ready();
    const boundedLimit = Math.max(0, limit);
    if (boundedLimit === 0) return [];

    return this.withTransaction(async (client) => {
      const now = this.now();

      const result = await client.query<OutboxRow>(
        `
          WITH picked AS (
            SELECT id
            FROM ${quoteIdentifier(this.schema)}.outbox
            WHERE delivered_at IS NULL
              AND (next_attempt_at IS NULL OR next_attempt_at <= $2::timestamptz)
              AND (claimed_at IS NULL OR claimed_at < ($2::timestamptz - INTERVAL '5 minutes'))
            ORDER BY created_at ASC
            LIMIT $1
            FOR UPDATE SKIP LOCKED
          ), claimed AS (
            UPDATE ${quoteIdentifier(this.schema)}.outbox o
            SET claimed_at = $2::timestamptz
            FROM picked
            WHERE o.id = picked.id
            RETURNING o.id, o.created_at, o.idempotency_key, o.payload, o.attempts, o.last_error, o.next_attempt_at
          )
          SELECT * FROM claimed
          ORDER BY created_at ASC
        `,
        [boundedLimit, now]
      );

      return result.rows.map((row: OutboxRow) => ({
        id: row.id,
        createdAt: row.created_at,
        idempotencyKey: row.idempotency_key,
        payload: row.payload,
        attempts: Number(row.attempts),
        lastError: row.last_error ?? undefined,
        nextAttemptAt:
          (row as OutboxRow & { next_attempt_at?: string | null }).next_attempt_at ?? undefined,
      }));
    });
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
    await this.withTransaction(async (client) => {
      const result = await client.query<MarkFailedRow>(
        `
          UPDATE ${quoteIdentifier(this.schema)}.outbox
          SET attempts = attempts + 1,
              last_error = $2,
              next_attempt_at = CASE
                WHEN attempts + 1 >= ${MAX_OUTBOX_ATTEMPTS} THEN NULL
                ELSE $3::timestamptz + make_interval(secs => LEAST(60, POWER(2, GREATEST(0, attempts))))
              END,
              claimed_at = NULL
          WHERE id = $1
          RETURNING attempts, payload, run_id
        `,
        [id, error, this.now()]
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
    });
  }

  async hasPendingRetries(): Promise<boolean> {
    this.ready();
    const result = await this.pool.query<{ has_pending_retries: boolean }>(
      `
        SELECT EXISTS (
          SELECT 1
          FROM ${quoteIdentifier(this.schema)}.outbox
          WHERE delivered_at IS NULL
            AND attempts > 0
            AND attempts < ${MAX_OUTBOX_ATTEMPTS}
        ) AS has_pending_retries
      `
    );
    return result.rows[0]?.has_pending_retries ?? false;
  }

  async listDeadLetter(limit: number, tenantId?: string): Promise<DeadLetterRecord[]> {
    this.ready();
    if (!tenantId) {
      throw new Error('TENANT_SCOPE_REQUIRED');
    }
    const boundedLimit = Math.max(0, limit);
    if (boundedLimit === 0) return [];

    const result = await this.pool.query<DeadLetterRow>(
      `
        SELECT dl.id, dl.original_id, dl.run_id, dl.payload, dl.last_error, dl.dead_lettered_at
        FROM ${quoteIdentifier(this.schema)}.outbox_dead_letter dl
        INNER JOIN ${quoteIdentifier(this.schema)}.run_metadata m ON m.run_id = dl.run_id
        WHERE m.tenant_id = $2
        ORDER BY dead_lettered_at DESC
        LIMIT $1
      `,
      [boundedLimit, tenantId]
    );

    return result.rows.map((row) => ({
      id: row.id,
      originalId: row.original_id,
      runId: row.run_id,
      payload: row.payload,
      lastError: row.last_error,
      deadLetteredAt: row.dead_lettered_at,
    }));
  }

  async replayDeadLetters(options?: {
    limit?: number;
    tenantId?: string;
    runId?: string;
    ids?: string[];
  }): Promise<number> {
    this.ready();
    const tenantId = options?.tenantId;
    if (!tenantId) {
      throw new Error('TENANT_SCOPE_REQUIRED');
    }
    const limit = Math.max(0, options?.limit ?? 100);
    if (limit === 0) return 0;

    return this.withTransaction(async (client) => {
      await PostgresStateStoreAdapter.setTenantContext(client, tenantId);

      const { params, where, replayedAtParam } = this.buildReplayDeadLettersParams(
        options,
        limit,
        tenantId
      );

      const result = await this.executeReplayDeadLettersQuery(
        client,
        params,
        where,
        replayedAtParam
      );

      return result.rows[0]?.moved ?? 0;
    });
  }

  private buildReplayDeadLettersParams(
    options: { limit?: number; tenantId?: string; runId?: string; ids?: string[] } | undefined,
    limit: number,
    tenantId: string
  ): { params: unknown[]; where: string[]; replayedAtParam: string } {
    const params: unknown[] = [limit, tenantId];
    const where: string[] = [];
    if (options?.runId) {
      params.push(options.runId);
      where.push(`dl.run_id = $${params.length}`);
    }
    if (options?.ids && options.ids.length > 0) {
      params.push(options.ids);
      where.push(`dl.id = ANY($${params.length}::text[])`);
    }
    const replayedAt = this.now();
    params.push(replayedAt);
    const replayedAtParam = `$${params.length}`;
    return { params, where, replayedAtParam };
  }

  private async executeReplayDeadLettersQuery(
    client: PoolClient,
    params: unknown[],
    where: string[],
    replayedAtParam: string
  ): Promise<{ rows: { moved: number }[] }> {
    const query = `
      WITH picked AS (
        SELECT dl.id, dl.original_id, dl.run_id, dl.payload
        FROM ${quoteIdentifier(this.schema)}.outbox_dead_letter dl
        INNER JOIN ${quoteIdentifier(this.schema)}.run_metadata m ON m.run_id = dl.run_id
        WHERE m.tenant_id = $2
        ${where.length > 0 ? `AND ${where.join(' AND ')}` : ''}
        ORDER BY dead_lettered_at ASC
        LIMIT $1
        FOR UPDATE
      ), inserted AS (
        INSERT INTO ${quoteIdentifier(this.schema)}.outbox (
          id,
          run_id,
          run_seq,
          created_at,
          idempotency_key,
          payload,
          attempts,
          last_error,
          claimed_at,
          delivered_at,
          next_attempt_at
        )
        SELECT
          p.original_id,
          p.run_id,
          ((p.payload->>'runSeq')::int),
          ${replayedAtParam}::timestamptz,
          (p.payload->>'idempotencyKey'),
          p.payload,
          0,
          NULL,
          NULL,
          NULL,
          NULL
        FROM picked p
        ON CONFLICT (id) DO UPDATE
        SET attempts = 0,
            last_error = NULL,
            claimed_at = NULL,
            delivered_at = NULL,
            next_attempt_at = NULL,
            created_at = EXCLUDED.created_at
        RETURNING id
      ), deleted AS (
        DELETE FROM ${quoteIdentifier(this.schema)}.outbox_dead_letter dl
        USING inserted i
        WHERE dl.original_id = i.id
        RETURNING dl.id
      )
      SELECT COUNT(*)::int AS moved FROM deleted
    `;
    return client.query<{ moved: number }>(query, params);
  }

  private ready(): void {
    if (!this.migratePromise) {
      throw new Error('MIGRATE_NOT_CALLED: call await adapter.migrate() before using the adapter');
    }
    if (!this.migrated) {
      throw new Error('MIGRATE_IN_PROGRESS: await adapter.migrate() before using the adapter');
    }
  }

  private async resolveRunTenantWithClient(client: PoolClient, runId: RunId): Promise<string> {
    const result = await client.query<{ tenant_id: string }>(
      `
        SELECT tenant_id
        FROM ${quoteIdentifier(this.schema)}.run_metadata
        WHERE run_id = $1
        LIMIT 1
      `,
      [runId]
    );
    const tenantId = result.rows[0]?.tenant_id;
    if (!tenantId) {
      throw new Error(`RUN_NOT_FOUND: ${runId}`);
    }
    return tenantId;
  }

  private async ensureSchema(): Promise<void> {
    await this.withTransaction(async (client) => {
      await this.ensureSchemaObjects(client);
      await this.ensureCompatibilityColumns(client);
      await this.ensureCompatibilityCleanup(client);
      await this.ensureIndexes(client);
    });
  }

  private async ensureSchemaObjects(client: PoolClient): Promise<void> {
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${quoteIdentifier(this.schema)}`);
    await this.ensureRunMetadataTable(client);
    await this.ensureRunEventsTable(client);
    await this.ensureOutboxTable(client);
    await this.ensureRunSnapshotsTable(client);
    await this.ensureOutboxDeadLetterTable(client);
  }

  private async ensureRunMetadataTable(client: PoolClient): Promise<void> {
    await client.query(`
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
  }

  private async ensureRunEventsTable(client: PoolClient): Promise<void> {
    await client.query(`
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
  }

  private async ensureOutboxTable(client: PoolClient): Promise<void> {
    await client.query(`
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
        next_attempt_at TIMESTAMPTZ,
        delivered_at TIMESTAMPTZ
      )
    `);
  }

  private async ensureRunSnapshotsTable(client: PoolClient): Promise<void> {
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${quoteIdentifier(this.schema)}.run_snapshots (
        run_id TEXT PRIMARY KEY,
        snapshot JSONB NOT NULL,
        last_run_seq INTEGER NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
      )
    `);
  }

  private async ensureOutboxDeadLetterTable(client: PoolClient): Promise<void> {
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${quoteIdentifier(this.schema)}.outbox_dead_letter (
        id TEXT PRIMARY KEY,
        original_id TEXT NOT NULL,
        run_id TEXT NOT NULL,
        payload JSONB NOT NULL,
        last_error TEXT NOT NULL,
        dead_lettered_at TIMESTAMPTZ NOT NULL
      )
    `);
  }

  private async ensureCompatibilityColumns(client: PoolClient): Promise<void> {
    await client.query(`
      ALTER TABLE ${quoteIdentifier(this.schema)}.outbox
      ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ
    `);

    await client.query(`
      ALTER TABLE ${quoteIdentifier(this.schema)}.outbox
      ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ
    `);

    await client.query(`
      ALTER TABLE ${quoteIdentifier(this.schema)}.run_metadata
      ADD COLUMN IF NOT EXISTS plan_id TEXT
    `);

    await client.query(`
      ALTER TABLE ${quoteIdentifier(this.schema)}.run_metadata
      ADD COLUMN IF NOT EXISTS plan_version TEXT
    `);

    await client.query(`
      ALTER TABLE ${quoteIdentifier(this.schema)}.run_events
      ADD COLUMN IF NOT EXISTS plan_id TEXT
    `);

    await client.query(`
      ALTER TABLE ${quoteIdentifier(this.schema)}.run_events
      ADD COLUMN IF NOT EXISTS plan_version TEXT
    `);

    await client.query(`
      ALTER TABLE ${quoteIdentifier(this.schema)}.run_events
      ADD COLUMN IF NOT EXISTS persisted_at TIMESTAMPTZ
    `);
  }

  private async ensureCompatibilityCleanup(client: PoolClient): Promise<void> {
    // Backward-compat cleanup for older schema revisions:
    // - drop redundant UNIQUE(run_id, run_seq) because id already encodes runId+runSeq
    await client.query(`
      ALTER TABLE ${quoteIdentifier(this.schema)}.outbox
      DROP CONSTRAINT IF EXISTS outbox_run_id_run_seq_key
    `);

    // If an old pending index exists with outdated definition, recreate deterministically.
    await client.query(
      `DROP INDEX IF EXISTS ${quoteIdentifier(this.schema)}.${quoteIdentifier('outbox_pending_idx')}`
    );

    // Backward-compat cleanup for previously created redundant run_events index.
    await client.query(
      `DROP INDEX IF EXISTS ${quoteIdentifier(this.schema)}.${quoteIdentifier('run_events_run_id_run_seq_idx')}`
    );
  }

  private async ensureIndexes(client: PoolClient): Promise<void> {
    await client.query(`
      CREATE INDEX IF NOT EXISTS outbox_pending_idx
      ON ${quoteIdentifier(this.schema)}.outbox (next_attempt_at, created_at, claimed_at)
      WHERE delivered_at IS NULL
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS outbox_dead_letter_run_id_idx
      ON ${quoteIdentifier(this.schema)}.outbox_dead_letter (run_id)
    `);

    // Tenant-scoped listing: listRuns(tenantId) requires this to avoid full scan.
    await client.query(`
      CREATE INDEX IF NOT EXISTS run_metadata_tenant_created_idx
      ON ${quoteIdentifier(this.schema)}.run_metadata (tenant_id, created_at DESC)
    `);
  }

  private async appendEventsTxWithClient(
    client: PoolClient,
    runId: RunId,
    envelopes: EventInput[]
  ): Promise<AppendResult> {
    await this.acquireRunLock(client, runId);
    const baseRunSeq = await this.getMaxRunSeq(client, runId);
    const { appended, deduped } = await this.insertAndDedupEvents(
      client,
      runId,
      envelopes,
      baseRunSeq
    );
    await this.updateRunSnapshot(client, runId, appended, baseRunSeq);

    return {
      appended,
      deduped,
      lastSeq: appended.at(-1)?.runSeq ?? baseRunSeq,
    };
  }

  private async acquireRunLock(client: PoolClient, runId: RunId): Promise<void> {
    // Use 64-bit MD5-derived lock key to avoid hashtext()'s 32-bit collision space.
    // Birthday bound is now ~2^32 rather than ~2^16 concurrent distinct runIds.
    await client.query(
      `SELECT pg_advisory_xact_lock(('x' || left(md5($1), 16))::bit(64)::bigint)`,
      [runId]
    );
  }

  private async getMaxRunSeq(client: PoolClient, runId: RunId): Promise<number> {
    const seqResult = await client.query<MaxSeqRow>(
      `SELECT COALESCE(MAX(run_seq), 0) AS max_seq FROM ${quoteIdentifier(this.schema)}.run_events WHERE run_id = $1`,
      [runId]
    );
    return Number(seqResult.rows[0]?.max_seq ?? 0);
  }

  private async insertAndDedupEvents(
    client: PoolClient,
    runId: RunId,
    envelopes: EventInput[],
    baseRunSeq: number
  ): Promise<{ appended: EventEnvelope[]; deduped: EventEnvelope[] }> {
    const appended: EventEnvelope[] = [];
    const deduped: EventEnvelope[] = [];
    let nextRunSeq = baseRunSeq + 1;

    for (const envelope of envelopes) {
      const withSeq = this.enrichEnvelopeWithSeq(envelope, nextRunSeq);
      await this.processEnvelopeInsertion(client, runId, withSeq, { appended, deduped });
      nextRunSeq += 1;
    }

    return { appended, deduped };
  }

  private async processEnvelopeInsertion(
    client: PoolClient,
    runId: RunId,
    withSeq: EventEnvelope,
    result: { appended: EventEnvelope[]; deduped: EventEnvelope[] }
  ): Promise<void> {
    const inserted = await this.tryInsertEvent(client, runId, withSeq);

    if (inserted) {
      result.appended.push(withSeq);
      return;
    }

    const existing = await this.getExistingEvent(client, runId, withSeq.idempotencyKey);
    if (existing) {
      result.deduped.push(existing);
    }
  }

  private enrichEnvelopeWithSeq(envelope: EventInput, runSeq: number): EventEnvelope {
    return {
      ...envelope,
      runSeq,
      persistedAt: this.now(),
    } as EventEnvelope;
  }

  private async tryInsertEvent(
    client: PoolClient,
    runId: RunId,
    withSeq: EventEnvelope
  ): Promise<boolean> {
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
        withSeq.runSeq,
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
    return (inserted.rowCount ?? 0) > 0;
  }

  private async getExistingEvent(
    client: PoolClient,
    runId: RunId,
    idempotencyKey: string
  ): Promise<EventEnvelope | null> {
    const result = await client.query<EventPayloadRow>(
      `
        SELECT payload
        FROM ${quoteIdentifier(this.schema)}.run_events
        WHERE run_id = $1 AND idempotency_key = $2
        LIMIT 1
      `,
      [runId, idempotencyKey]
    );
    return result.rows[0]?.payload ?? null;
  }

  private async updateRunSnapshot(
    client: PoolClient,
    runId: RunId,
    appended: EventEnvelope[],
    baseRunSeq: number
  ): Promise<void> {
    if (appended.length === 0) {
      return;
    }

    const snap = await this.getOrCreateSnapshot(client, runId, baseRunSeq);
    for (const e of appended) {
      applyEventToSnapshot(snap, e);
    }
    await this.persistSnapshot(client, runId, snap, appended);
  }

  private async getOrCreateSnapshot(
    client: PoolClient,
    runId: RunId,
    baseRunSeq: number
  ): Promise<WorkflowSnapshot> {
    if (baseRunSeq > 0) {
      const currentSnap = await client.query<SnapshotRow>(
        `SELECT snapshot FROM ${quoteIdentifier(this.schema)}.run_snapshots WHERE run_id = $1`,
        [runId]
      );
      if (currentSnap.rows[0]?.snapshot) {
        return currentSnap.rows[0].snapshot;
      }
    }

    return {
      runId,
      status: 'PENDING',
      paused: false,
      cancelling: false,
      gatewayDecisions: {},
      steps: {},
    };
  }

  private async persistSnapshot(
    client: PoolClient,
    runId: RunId,
    snap: WorkflowSnapshot,
    appended: EventEnvelope[]
  ): Promise<void> {
    const lastSeq = appended.at(-1)!.runSeq;
    await client.query(
      `
        INSERT INTO ${quoteIdentifier(this.schema)}.run_snapshots (run_id, snapshot, last_run_seq, updated_at)
        VALUES ($1, $2::jsonb, $3, $4::timestamptz)
        ON CONFLICT (run_id) DO UPDATE SET
          snapshot = EXCLUDED.snapshot,
          last_run_seq = EXCLUDED.last_run_seq,
          updated_at = EXCLUDED.updated_at
      `,
      [runId, JSON.stringify(snap), lastSeq, this.now()]
    );
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
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === '23505'
  );
}
