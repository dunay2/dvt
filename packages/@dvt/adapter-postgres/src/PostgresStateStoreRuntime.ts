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
export class PostgresStateStoreRuntime {
  private readonly pool: Pool;
  protected readonly ownsPool: boolean;
  private readonly schema: string;
  private readonly now: () => string;
  private readonly statementTimeoutMs: number;
  private readonly outboxShardCount: number;
  protected readonly clientSession: PostgresAdapterClientSession;
  protected readonly schemaManager: PostgresSchemaManager;
  protected readonly outboxStore: PostgresOutboxStore;
  protected readonly metadataRepo: PostgresRunMetadataRepository;
  protected readonly runEventRepository: RunEventWriteRepository & RunEventReadRepository;
  protected readonly snapshotStore: PostgresRunSnapshotStore;
  protected readonly runStateCoordinator: PostgresRunStateCoordinator;
  protected readonly snapshotStalenessQuery: PostgresSnapshotStalenessQuery;
  protected readonly lineageOutboxStore: PostgresLineageOutboxStore;

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

  protected ready(): void {
    this.schemaManager.ready();
  }
}
