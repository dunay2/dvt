/**
 * @file packages/@dvt/adapter-postgres/src/PostgresStateStoreRuntime.ts
 * @baseline ADR-0004: Event Sourcing Strategy (Extended)
 * @baseline ADR-0003: Execution Model
 * @baseline ADR-0031: Storage Adapter Tenant Isolation Strategy
 * @decision Section 2.1 - Append-only event persistence with monotonic sequence semantics
 * @decision Section 2.2 - Read model snapshot projection derived from persisted event stream
 * @decision All adapter methods enforce tenant scope per ADR-0031
 * @consequence PostgreSQL adapter preserves deterministic replay and transactional state consistency
 * @consequence Cross-tenant reads/writes are blocked at the adapter boundary
 * @version 1.0.0
 * @date 2026-02-21
 */
import type { ILineageOutboxStore } from '@dvt/contracts';
import type { ArchivedTerminalSnapshot, TerminalSnapshotPinResult } from '@dvt/state-store';
import { Pool } from 'pg';

import { PostgresAdapterClientSession } from './PostgresAdapterClientSession.js';
import {
  PostgresLineageOutboxStore,
  normalizeLineageOutboxClaimTimeoutMs,
} from './PostgresLineageOutboxStore.js';
import {
  PostgresOutboxStore,
  normalizeOutboxClaimTimeoutMs,
  normalizeOutboxShardCount,
} from './PostgresOutboxStore.js';
import { PostgresRunEventStore } from './PostgresRunEventStore.js';
import { PostgresRunMetadataRepository } from './PostgresRunMetadataRepository.js';
import { PostgresRunSnapshotStore } from './PostgresRunSnapshotStore.js';
import { PostgresRunStateCoordinator } from './PostgresRunStateCoordinator.js';
import { PostgresSchemaManager, type PostgresSchemaRollbackPlan } from './PostgresSchemaManager.js';
import { PostgresSnapshotStalenessQuery } from './PostgresSnapshotStalenessQuery.js';
import type {
  RunEventReadRepository,
  RunEventRepositoryDeps,
  RunEventWriteRepository,
} from './RunEventWriteRepository.js';
import { normalizeSchema } from './sqlUtils.js';
import type {
  AppendResult,
  DeadLetterRecord,
  EventEnvelope,
  EventInput,
  IOutboxStorage,
  IRunSnapshotStalenessQuery,
  IRunStateStore,
  ListEventsOptions,
  ListRunsOptions,
  OutboxRecord,
  RetryAttemptReservation,
  RunBootstrapInput,
  RunId,
  RunMetadata,
  WorkflowSnapshot,
} from './types.js';

export interface PostgresStateStoreRuntimeConfig {
  connectionString?: string;
  schema?: string;
  pool?: Pool;
  now?: () => string;
  statementTimeoutMs?: number;
  queryTimeoutMs?: number;
  assumeSchemaReady?: boolean;
  outboxShardCount?: number;
  outboxClaimTimeoutMs?: number;
  lineageOutboxClaimTimeoutMs?: number;
  runEventRepositoryFactory?: (
    deps: RunEventRepositoryDeps
  ) => RunEventWriteRepository & RunEventReadRepository;
}

/**
 * Foundation adapter for issue #6 (Postgres state store implementation).
 *
 * SQL-backed implementation for run metadata, run events and outbox.
 *
 * - run metadata and event append are persisted in PostgreSQL
 * - idempotency is enforced by UNIQUE(run_id, idempotency_key)
 * - outbox entries are persisted with retry metadata
 */
export class PostgresStateStoreRuntime
  implements IRunStateStore, IRunSnapshotStalenessQuery, IOutboxStorage
{
  private readonly pool: Pool;
  private readonly ownsPool: boolean;
  private readonly schema: string;
  private readonly now: () => string;
  private readonly statementTimeoutMs: number;
  private readonly outboxShardCount: number;
  private readonly clientSession: PostgresAdapterClientSession;
  private readonly schemaManager: PostgresSchemaManager;
  private readonly outboxStore: PostgresOutboxStore;
  private readonly metadataRepo: PostgresRunMetadataRepository;
  private readonly runEventRepository: RunEventWriteRepository & RunEventReadRepository;
  private readonly snapshotStore: PostgresRunSnapshotStore;
  private readonly runStateCoordinator: PostgresRunStateCoordinator;
  private readonly snapshotStalenessQuery: PostgresSnapshotStalenessQuery;
  private readonly lineageOutboxStore: PostgresLineageOutboxStore;

  constructor(readonly config: PostgresStateStoreRuntimeConfig = {}) {
    this.schema = normalizeSchema(config.schema ?? 'dvt');
    this.now = config.now ?? (() => new Date().toISOString());
    this.statementTimeoutMs =
      config.statementTimeoutMs ?? Number(process.env['DVT_PG_STATEMENT_TIMEOUT_MS'] ?? 0);
    this.outboxShardCount = normalizeOutboxShardCount(config.outboxShardCount);

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

    this.clientSession = new PostgresAdapterClientSession(this.pool, this.statementTimeoutMs);
    this.schemaManager = new PostgresSchemaManager(this.pool, this.schema, this.statementTimeoutMs);

    const outboxClaimTimeoutMs = normalizeOutboxClaimTimeoutMs(config.outboxClaimTimeoutMs);
    this.outboxStore = new PostgresOutboxStore(
      this.schema,
      this.now,
      this.outboxShardCount,
      outboxClaimTimeoutMs,
      (fn) => this.clientSession.withTransaction(fn),
      (fn) => this.clientSession.withClient(fn)
    );

    this.metadataRepo = new PostgresRunMetadataRepository(this.schema, (fn) =>
      this.clientSession.withClient(fn)
    );

    const runEventRepositoryFactory =
      config.runEventRepositoryFactory ??
      ((deps: RunEventRepositoryDeps): RunEventWriteRepository & RunEventReadRepository =>
        new PostgresRunEventStore(deps.schema, deps.now, deps.withClient));

    this.runEventRepository = runEventRepositoryFactory({
      schema: this.schema,
      now: this.now,
      withClient: (fn) => this.clientSession.withClient(fn),
    });

    this.snapshotStore = new PostgresRunSnapshotStore(
      this.schema,
      this.now,
      (fn) => this.clientSession.withTransaction(fn),
      (fn) => this.clientSession.withClient(fn)
    );

    this.runStateCoordinator = new PostgresRunStateCoordinator({
      metadataRepo: this.metadataRepo,
      runEventRepository: this.runEventRepository,
      snapshotStore: this.snapshotStore,
      outboxStore: this.outboxStore,
      setTenantContext: (client, tenantId) =>
        PostgresSchemaManager.setTenantContext(client, tenantId),
      withTransaction: (fn) => this.clientSession.withTransaction(fn),
    });

    this.snapshotStalenessQuery = new PostgresSnapshotStalenessQuery(this.schema, (fn) =>
      this.clientSession.withClient(fn)
    );

    this.lineageOutboxStore = new PostgresLineageOutboxStore(
      this.schema,
      this.now,
      normalizeLineageOutboxClaimTimeoutMs(config.lineageOutboxClaimTimeoutMs),
      (fn) => this.clientSession.withTransaction(fn),
      (fn) => this.clientSession.withClient(fn)
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
   * Must be called and awaited once before the adapter is used.
   * Safe to call multiple times: subsequent calls are no-ops (idempotent).
   *
   * Separating DDL from the constructor allows the adapter to be instantiated in
   * IAM-restricted environments where the runtime role has no DDL privileges, and
   * migrations are run as a separate privileged step.
   */
  async migrate(): Promise<void> {
    return this.schemaManager.migrate();
  }

  async planSchemaRollback(targetVersion: string | null): Promise<PostgresSchemaRollbackPlan> {
    return this.schemaManager.planRollback(targetVersion);
  }

  async rollbackSchemaTo(targetVersion: string | null): Promise<PostgresSchemaRollbackPlan> {
    if (this.clientSession.hasActiveClients()) {
      throw new Error('SCHEMA_ROLLBACK_ACTIVE_CLIENTS');
    }
    return this.schemaManager.rollbackTo(targetVersion);
  }

  async close(): Promise<void> {
    await this.clientSession.close(this.ownsPool);
  }

  abortPendingOperations(): void {
    this.clientSession.abortPendingOperations();
  }

  async appendAndEnqueueTx(runId: RunId, envelopes: EventInput[]): Promise<AppendResult> {
    this.ready();
    return this.runStateCoordinator.appendAndEnqueueTx(runId, envelopes);
  }

  async bootstrapRunTx(input: RunBootstrapInput): Promise<AppendResult> {
    this.ready();
    return this.runStateCoordinator.bootstrapRunTx(input);
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

  async getRunMetadataByRunId(tenantId: string, runId: string): Promise<RunMetadata | null> {
    this.ready();
    return this.metadataRepo.getByRunId(tenantId, runId);
  }

  async listRuns(options: ListRunsOptions): Promise<RunMetadata[]> {
    this.ready();
    return this.metadataRepo.listRuns(options);
  }

  async reserveRetryAttempt(
    tenantId: string,
    sourceRunId: RunId
  ): Promise<RetryAttemptReservation> {
    this.ready();
    return this.metadataRepo.reserveRetryAttempt(tenantId, sourceRunId);
  }

  async listEvents(
    tenantId: string,
    runId: string,
    options?: ListEventsOptions
  ): Promise<EventEnvelope[]> {
    this.ready();
    return this.runEventRepository.listEvents(tenantId, runId, options);
  }

  async getSnapshot(tenantId: string, runId: RunId): Promise<WorkflowSnapshot | null> {
    this.ready();
    return this.snapshotStore.getSnapshot(tenantId, runId);
  }

  async pinTerminalSnapshot(
    snapshot: ArchivedTerminalSnapshot
  ): Promise<TerminalSnapshotPinResult> {
    this.ready();
    return this.snapshotStore.pinTerminalSnapshot(snapshot);
  }

  async getPinnedTerminalSnapshot(
    tenantId: string,
    runId: RunId
  ): Promise<ArchivedTerminalSnapshot | null> {
    this.ready();
    return this.snapshotStore.getPinnedTerminalSnapshot(tenantId, runId);
  }

  /**
   * ADR-0004 Section 2.2 - Full event replay from runSeq=1, overwrites the materialized snapshot.
   * ADR-0031 - Tenant isolation verified before replay; throws RUN_NOT_FOUND on mismatch.
   */
  async rebuildSnapshot(tenantId: string, runId: RunId): Promise<WorkflowSnapshot> {
    this.ready();
    return this.snapshotStore.rebuildSnapshot(tenantId, runId);
  }

  async listStaleSnapshotRuns(
    batchSize: number
  ): Promise<Array<{ runId: string; tenantId: string }>> {
    this.ready();
    return this.snapshotStalenessQuery.listStaleSnapshotRuns(batchSize);
  }

  async enqueueTx(runId: RunId, events: EventEnvelope[]): Promise<void> {
    this.ready();
    await this.runStateCoordinator.enqueueTx(runId, events);
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

  async listDeadLetter(limit: number, tenantId: string): Promise<DeadLetterRecord[]> {
    this.ready();
    return this.outboxStore.listDeadLetter(limit, tenantId);
  }

  getLineageOutboxStore(): ILineageOutboxStore {
    this.ready();
    return this.lineageOutboxStore;
  }

  async replayDeadLetters(options: {
    tenantId: string;
    limit?: number;
    runId?: string;
    ids?: string[];
  }): Promise<number> {
    this.ready();
    return this.outboxStore.replayDeadLetters(options);
  }

  private ready(): void {
    this.schemaManager.ready();
  }
}
