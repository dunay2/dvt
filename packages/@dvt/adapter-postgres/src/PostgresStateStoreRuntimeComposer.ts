import type { Pool } from 'pg';
import { Pool as PostgresPool } from 'pg';

import { normalizeLineageOutboxClaimTimeoutMs } from './lineageOutboxStorePolicy.js';
import { PostgresAdapterClientSession } from './PostgresAdapterClientSession.js';
import { resolvePostgresConnectionString } from './PostgresAdapterConnectionString.js';
import { POSTGRES_ADAPTER_RUNTIME_CONSTANTS as C } from './PostgresAdapterConstants.js';
import { PostgresLineageOutboxStore } from './PostgresLineageOutboxStore.js';
import {
  PostgresOutboxStore,
  normalizeOutboxClaimTimeoutMs,
  normalizeOutboxShardCount,
} from './PostgresOutboxStore.js';
import { PostgresRunEventStore } from './PostgresRunEventStore.js';
import { PostgresRunMetadataRepository } from './PostgresRunMetadataRepository.js';
import { PostgresRunSnapshotStore } from './PostgresRunSnapshotStore.js';
import { PostgresRunStateCoordinator } from './PostgresRunStateCoordinator.js';
import { PostgresSchemaManager } from './PostgresSchemaManager.js';
import { PostgresSnapshotStalenessQuery } from './PostgresSnapshotStalenessQuery.js';
import { PostgresSnapshotWorkQueue } from './PostgresSnapshotWorkQueue.js';
import type { PostgresStateStoreRuntimeConfig } from './PostgresStateStoreRuntimeConfig.js';
import type { RunEventWriteRepository, RunEventReadRepository } from './RunEventWriteRepository.js';
import { normalizeSchema } from './sqlUtils.js';

export interface PostgresStateStoreRuntimeServices {
  readonly ownsPool: boolean;
  readonly clientSession: PostgresAdapterClientSession;
  readonly schemaManager: PostgresSchemaManager;
  readonly outboxStore: PostgresOutboxStore;
  readonly metadataRepo: PostgresRunMetadataRepository;
  readonly runEventRepository: RunEventWriteRepository & RunEventReadRepository;
  readonly snapshotStore: PostgresRunSnapshotStore;
  readonly runStateCoordinator: PostgresRunStateCoordinator;
  readonly snapshotStalenessQuery: PostgresSnapshotStalenessQuery;
  readonly snapshotWorkQueue: PostgresSnapshotWorkQueue;
  readonly lineageOutboxStore: PostgresLineageOutboxStore;
}

export function composePostgresStateStoreRuntime(
  config: PostgresStateStoreRuntimeConfig
): PostgresStateStoreRuntimeServices {
  const schema = normalizeSchema(config.schema ?? C.defaultSchema);
  const now = config.now ?? (() => new Date().toISOString());
  const statementTimeoutMs =
    config.statementTimeoutMs ??
    Number(process.env[C.statementTimeoutEnvVar] ?? C.defaultTimeoutMs);
  const outboxShardCount = normalizeOutboxShardCount(config.outboxShardCount);

  const { pool, ownsPool } = resolvePool(config, statementTimeoutMs);
  const clientSession = new PostgresAdapterClientSession(pool, statementTimeoutMs);
  const schemaManager = new PostgresSchemaManager(pool, schema, statementTimeoutMs);

  const outboxClaimTimeoutMs = normalizeOutboxClaimTimeoutMs(config.outboxClaimTimeoutMs);
  const outboxStore = new PostgresOutboxStore(
    schema,
    now,
    outboxShardCount,
    outboxClaimTimeoutMs,
    (fn) => clientSession.withTransaction(fn),
    (fn) => clientSession.withClient(fn)
  );

  const metadataRepo = new PostgresRunMetadataRepository(schema, (fn) =>
    clientSession.withClient(fn)
  );
  const runEventRepositoryFactory =
    config.runEventRepositoryFactory ??
    ((deps) => new PostgresRunEventStore(deps.schema, deps.now, deps.withClient));
  const runEventRepository = runEventRepositoryFactory({
    schema,
    now,
    withClient: (fn) => clientSession.withClient(fn),
  });

  const snapshotStore = new PostgresRunSnapshotStore(
    schema,
    now,
    (fn) => clientSession.withTransaction(fn),
    (fn) => clientSession.withClient(fn)
  );
  const runStateCoordinator = new PostgresRunStateCoordinator({
    metadataRepo,
    runEventRepository,
    snapshotStore,
    outboxStore,
    setTenantContext: (client, tenantId) =>
      PostgresSchemaManager.setTenantContext(client, tenantId),
    withTransaction: (fn) => clientSession.withTransaction(fn),
  });
  const snapshotStalenessQuery = new PostgresSnapshotStalenessQuery(schema, (fn) =>
    clientSession.withClient(fn)
  );
  const snapshotWorkQueue = new PostgresSnapshotWorkQueue(schema, (fn) =>
    clientSession.withClient(fn)
  );
  const lineageOutboxStore = new PostgresLineageOutboxStore(
    schema,
    now,
    normalizeLineageOutboxClaimTimeoutMs(config.lineageOutboxClaimTimeoutMs),
    (fn) => clientSession.withTransaction(fn),
    (fn) => clientSession.withClient(fn)
  );

  if (config.assumeSchemaReady) {
    schemaManager.markReady();
  }

  return {
    ownsPool,
    clientSession,
    schemaManager,
    outboxStore,
    metadataRepo,
    runEventRepository,
    snapshotStore,
    runStateCoordinator,
    snapshotStalenessQuery,
    snapshotWorkQueue,
    lineageOutboxStore,
  };
}

function resolvePool(
  config: PostgresStateStoreRuntimeConfig,
  statementTimeoutMs: number
): { pool: Pool; ownsPool: boolean } {
  if (config.pool) {
    return { pool: config.pool, ownsPool: false };
  }

  const connectionString = resolvePostgresConnectionString(config.connectionString);
  const pool = new PostgresPool({
    connectionString,
    statement_timeout: statementTimeoutMs,
    query_timeout:
      config.queryTimeoutMs ?? Number(process.env[C.queryTimeoutEnvVar] ?? C.defaultTimeoutMs),
  });
  return { pool, ownsPool: true };
}
