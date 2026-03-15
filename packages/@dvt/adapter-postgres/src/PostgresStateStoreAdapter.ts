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

import { PostgresOutboxStore, normalizeOutboxShardCount } from './PostgresOutboxStore.js';
import { PostgresRunEventStore } from './PostgresRunEventStore.js';
import { PostgresRunMetadataRepository } from './PostgresRunMetadataRepository.js';
import { PostgresRunSnapshotStore } from './PostgresRunSnapshotStore.js';
import { PostgresSchemaManager } from './PostgresSchemaManager.js';
import { normalizeSchema } from './sqlUtils.js';
import type {
  AppendResult,
  DeadLetterRecord,
  EventEnvelope,
  EventInput,
  IOutboxStorage,
  IRunStateStore,
  ListEventsOptions,
  ListRunsOptions,
  OutboxRecord,
  RunBootstrapInput,
  RunId,
  RunMetadata,
  WorkflowSnapshot,
} from './types.js';

export interface PostgresAdapterConfig {
  connectionString?: string;
  schema?: string;
  pool?: Pool;
  now?: () => string;
  statementTimeoutMs?: number;
  queryTimeoutMs?: number;
  assumeSchemaReady?: boolean;
  outboxShardCount?: number;
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
  private readonly schema: string;
  private readonly now: () => string;
  private readonly statementTimeoutMs: number;
  private readonly outboxShardCount: number;
  private readonly activeClients = new Set<PoolClient>();
  private abortPendingOperationsRequested = false;
  private readonly schemaManager: PostgresSchemaManager;
  private readonly outboxStore: PostgresOutboxStore;
  private readonly metadataRepo: PostgresRunMetadataRepository;
  private readonly eventStore: PostgresRunEventStore;
  private readonly snapshotStore: PostgresRunSnapshotStore;

  constructor(readonly config: PostgresAdapterConfig = {}) {
    this.schema = normalizeSchema(config.schema ?? 'dvt');
    this.now = config.now ?? (() => new Date().toISOString());
    this.statementTimeoutMs =
      config.statementTimeoutMs ?? Number(process.env.DVT_PG_STATEMENT_TIMEOUT_MS ?? 0);
    this.outboxShardCount = normalizeOutboxShardCount(config.outboxShardCount);

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

    this.schemaManager = new PostgresSchemaManager(this.pool, this.schema);
    this.outboxStore = new PostgresOutboxStore(
      this.schema,
      this.now,
      this.outboxShardCount,
      (fn) => this.withTransaction(fn),
      (fn) => this.withClient(fn)
    );
    this.metadataRepo = new PostgresRunMetadataRepository(
      this.schema,
      this.now,
      (fn) => this.withTransaction(fn),
      (fn) => this.withClient(fn)
    );
    this.eventStore = new PostgresRunEventStore(
      this.schema,
      this.now,
      (fn) => this.withTransaction(fn),
      (fn) => this.withClient(fn)
    );
    this.snapshotStore = new PostgresRunSnapshotStore(
      this.schema,
      this.now,
      (fn) => this.withTransaction(fn),
      (fn) => this.withClient(fn)
    );
    if (config.assumeSchemaReady) {
      this.schemaManager.markReady();
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
    return this.schemaManager.migrate();
  }

  async close(): Promise<void> {
    await this.abortPendingOperations();
    if (this.ownsPool) {
      await this.pool.end();
    }
  }

  async abortPendingOperations(): Promise<void> {
    this.abortPendingOperationsRequested = true;
    const clients = [...this.activeClients];
    for (const client of clients) {
      this.releaseClient(client, true);
    }
  }

  private async withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.connect();
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
        // Connection may already be torn down during shutdown interruption.
      }
      throw error;
    } finally {
      this.releaseClient(client);
    }
  }

  private async withClient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.connect();
    try {
      return await fn(client);
    } finally {
      this.releaseClient(client);
    }
  }

  private async resolveAndSetTenantContext(client: PoolClient, runId: RunId): Promise<string> {
    const tenantId = await this.metadataRepo.resolveTenantWithClient(client, runId);
    await PostgresSchemaManager.setTenantContext(client, tenantId);
    return tenantId;
  }

  private async appendEventsTxWithClient(
    client: PoolClient,
    runId: RunId,
    envelopes: EventInput[]
  ): Promise<AppendResult> {
    const { appended, deduped, lastAppendedRunSeq, baseRunSeq } =
      await this.eventStore.appendWithClient(client, runId, envelopes);
    await this.snapshotStore.updateWithClient(client, runId, appended, baseRunSeq, lastAppendedRunSeq);
    return { appended, deduped, lastSeq: lastAppendedRunSeq ?? baseRunSeq };
  }

  async appendAndEnqueueTx(runId: RunId, envelopes: EventInput[]): Promise<AppendResult> {
    this.ready();
    return this.withTransaction(async (client) => {
      await this.resolveAndSetTenantContext(client, runId);
      const append = await this.appendEventsTxWithClient(client, runId, envelopes);
      await this.outboxStore.enqueueWithClient(client, runId, append.appended);
      return append;
    });
  }

  async bootstrapRunTx(input: RunBootstrapInput): Promise<AppendResult> {
    this.ready();
    try {
      return await this.withTransaction(async (client) => {
        await PostgresSchemaManager.setTenantContext(client, input.metadata.tenantId);
        await this.metadataRepo.insertWithClient(client, input.metadata);
        const append = await this.appendEventsTxWithClient(
          client,
          input.metadata.runId as RunId,
          input.firstEvents
        );
        await this.outboxStore.enqueueWithClient(client, input.metadata.runId as RunId, append.appended);
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
    return this.metadataRepo.saveProviderRef(tenantId, runId, runRef);
  }

  /**
   * @deprecated Use bootstrapRunTx. This upsert bypasses the atomic
   * metadata + first-event + snapshot guarantee and may cause
   * IRunStateStore.getSnapshot to return null for the run. Scheduled for
   * removal in Phase 3.
   */
  async saveRunMetadata(meta: RunMetadata): Promise<void> {
    this.ready();
    return this.metadataRepo.saveRunMetadata(meta);
  }

  async getRunMetadataByRunId(tenantId: string, runId: string): Promise<RunMetadata | null> {
    this.ready();
    return this.metadataRepo.getByRunId(tenantId, runId);
  }

  async listRuns(options: ListRunsOptions): Promise<RunMetadata[]> {
    this.ready();
    return this.metadataRepo.listRuns(options);
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
    return this.eventStore.listEvents(tenantId, runId, options);
  }

  async getSnapshot(tenantId: string, runId: RunId): Promise<WorkflowSnapshot | null> {
    this.ready();
    return this.snapshotStore.getSnapshot(tenantId, runId);
  }

  /**
   * ADR-0004 §2.2 — Full event replay from runSeq=1, overwrites the materialized snapshot.
   * ADR-0031 — Tenant isolation verified before replay; throws RUN_NOT_FOUND on mismatch.
   */
  async rebuildSnapshot(tenantId: string, runId: RunId): Promise<WorkflowSnapshot> {
    this.ready();
    return this.snapshotStore.rebuildSnapshot(tenantId, runId);
  }

  /**
   * Returns up to `batchSize` runs with a missing or stale snapshot.
   *
   * A snapshot is stale when `run_snapshots.last_run_seq < MAX(run_events.run_seq)` for
   * that run, or when no snapshot row exists at all.
   *
   * The result is ordered by `run_metadata.created_at ASC` so the oldest runs
   * are repaired first (FIFO catch-up order).
   */
  async listStaleSnapshotRuns(
    batchSize: number
  ): Promise<Array<{ runId: string; tenantId: string }>> {
    this.ready();
    return this.withClient(async (client) => {
      const result = await client.query<{ run_id: string; tenant_id: string }>(
        `SELECT m.run_id, m.tenant_id
           FROM ${this.schema}.run_metadata m
           LEFT JOIN ${this.schema}.run_snapshots s ON s.run_id = m.run_id
          WHERE s.run_id IS NULL
             OR s.last_run_seq < (
                  SELECT MAX(e.run_seq)
                    FROM ${this.schema}.run_events e
                   WHERE e.run_id = m.run_id
                )
          ORDER BY m.created_at ASC
          LIMIT $1`,
        [batchSize]
      );
      return result.rows.map((row) => ({ runId: row.run_id, tenantId: row.tenant_id }));
    });
  }

  async enqueueTx(runId: RunId, events: EventEnvelope[]): Promise<void> {
    this.ready();
    await this.withTransaction(async (client) => {
      await this.resolveAndSetTenantContext(client, runId);
      await this.outboxStore.enqueueWithClient(client, runId, events);
    });
  }

  async listPending(limit: number): Promise<OutboxRecord[]> {
    this.ready();
    return this.outboxStore.listPending(limit);
  }

  async listPendingForClaim(
    limit: number,
    selection?: { shardIds?: readonly number[] }
  ): Promise<OutboxRecord[]> {
    this.ready();
    return this.outboxStore.listPendingForClaim(limit, selection);
  }

  async markDelivered(ids: string[]): Promise<void> {
    this.ready();
    return this.outboxStore.markDelivered(ids);
  }

  async markFailed(id: string, error: string): Promise<void> {
    this.ready();
    return this.outboxStore.markFailed(id, error);
  }

  async hasPendingRetries(selection?: { shardIds?: readonly number[] }): Promise<boolean> {
    this.ready();
    return this.outboxStore.hasPendingRetries(selection);
  }

  async listDeadLetter(limit: number, tenantId?: string): Promise<DeadLetterRecord[]> {
    this.ready();
    return this.outboxStore.listDeadLetter(limit, tenantId);
  }

  async replayDeadLetters(options?: {
    limit?: number;
    tenantId?: string;
    runId?: string;
    ids?: string[];
  }): Promise<number> {
    this.ready();
    return this.outboxStore.replayDeadLetters(options);
  }

  private ready(): void {
    this.schemaManager.ready();
  }

  private async connect(): Promise<PoolClient> {
    this.throwIfPendingOperationsAborted();
    const client = await this.pool.connect();
    if (this.abortPendingOperationsRequested) {
      client.release(true);
      throw createPendingOperationsAbortedError();
    }
    this.activeClients.add(client);
    return client;
  }

  private throwIfPendingOperationsAborted(): void {
    if (this.abortPendingOperationsRequested) {
      throw createPendingOperationsAbortedError();
    }
  }

  private releaseClient(client: PoolClient, destroy = false): void {
    if (!this.activeClients.delete(client)) {
      return;
    }
    client.release(destroy);
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

function createPendingOperationsAbortedError(): Error {
  const error = new Error('PENDING_OPERATIONS_ABORTED');
  error.name = 'AbortError';
  return error;
}
