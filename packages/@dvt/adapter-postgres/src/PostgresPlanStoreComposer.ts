/**
 * Owned concern: compose the scoped Postgres plan-store adapter internals.
 */
import type { Pool } from 'pg';
import { Pool as PostgresPool } from 'pg';

import { PostgresPlanAdmissionRepository } from './PostgresPlanStore.admission-repository.js';
import { PostgresPlanExecutabilityRepository } from './PostgresPlanStore.executability-repository.js';
import { PostgresExecutableBlobRepository } from './PostgresPlanStore.executable-blob-repository.js';
import { PostgresPlanRecordRepository } from './PostgresPlanStore.plan-record-repository.js';
import { PostgresPlanStoreSchemaManager } from './PostgresPlanStore.schema-manager.js';
import { PostgresPlanStoreTxRunner } from './PostgresPlanStore.tx.js';
import { normalizeSchema } from './sqlUtils.js';

export interface PostgresPlanStoreComposerConfig {
  connectionString?: string;
  schema?: string;
  pool?: Pool;
  statementTimeoutMs?: number;
  queryTimeoutMs?: number;
}

export interface PostgresPlanStoreServices {
  readonly pool: Pool;
  readonly ownsPool: boolean;
  readonly schema: string;
  readonly txRunner: PostgresPlanStoreTxRunner;
  readonly schemaManager: PostgresPlanStoreSchemaManager;
  readonly planRecordRepository: PostgresPlanRecordRepository;
  readonly planExecutabilityRepository: PostgresPlanExecutabilityRepository;
  readonly planAdmissionRepository: PostgresPlanAdmissionRepository;
  readonly executableBlobRepository: PostgresExecutableBlobRepository;
}

export function composePostgresPlanStore(
  config: PostgresPlanStoreComposerConfig
): PostgresPlanStoreServices {
  const schema = normalizeSchema(config.schema ?? 'dvt');
  const statementTimeoutMs =
    config.statementTimeoutMs ?? Number(process.env['DVT_PG_STATEMENT_TIMEOUT_MS'] ?? 0);

  const { pool, ownsPool } = resolvePool(config, statementTimeoutMs);
  const txRunner = new PostgresPlanStoreTxRunner(pool, statementTimeoutMs);

  return {
    pool,
    ownsPool,
    schema,
    txRunner,
    schemaManager: new PostgresPlanStoreSchemaManager(schema, txRunner),
    planRecordRepository: new PostgresPlanRecordRepository(schema),
    planExecutabilityRepository: new PostgresPlanExecutabilityRepository(schema),
    planAdmissionRepository: new PostgresPlanAdmissionRepository(schema),
    executableBlobRepository: new PostgresExecutableBlobRepository(schema),
  };
}

function resolvePool(
  config: PostgresPlanStoreComposerConfig,
  statementTimeoutMs: number
): { pool: Pool; ownsPool: boolean } {
  if (config.pool) {
    return { pool: config.pool, ownsPool: false };
  }

  const pool = new PostgresPool({
    connectionString:
      config.connectionString ??
      process.env['DVT_PG_URL'] ??
      process.env['DATABASE_URL'] ??
      'postgresql://dvt:dvt@localhost:5432/dvt',
    statement_timeout: statementTimeoutMs,
    query_timeout: config.queryTimeoutMs ?? Number(process.env['DVT_PG_QUERY_TIMEOUT_MS'] ?? 0),
  });
  return { pool, ownsPool: true };
}
