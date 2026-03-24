import { Pool } from 'pg';
import type { PoolClient } from 'pg';

import { PostgresLineageOutboxStore, PostgresStateStoreAdapter } from '@dvt/adapter-postgres';
import { HttpOpenLineageSink } from '@dvt/traceability-service';

import type { Env } from './env.js';

export interface LineageWorkerBootstrapDeps {
  poolFactory?: (env: Env) => Pool;
}

export interface LineageWorkerBootstrapResult {
  stateStore: PostgresStateStoreAdapter;
  lineageStore: PostgresLineageOutboxStore;
  sink: HttpOpenLineageSink;
  close(): Promise<void>;
}

export function buildLineageWorkerBootstrap(
  env: Env,
  deps: LineageWorkerBootstrapDeps = {}
): LineageWorkerBootstrapResult {
  const pool = deps.poolFactory?.(env) ?? new Pool({ connectionString: env.DATABASE_URL });
  const withClient = createWithClient(pool);

  const stateStore = new PostgresStateStoreAdapter({
    pool,
    schema: env.DVT_PG_SCHEMA,
    statementTimeoutMs: env.DVT_PG_STATEMENT_TIMEOUT_MS,
    queryTimeoutMs: env.DVT_PG_QUERY_TIMEOUT_MS,
  });

  const lineageStore = new PostgresLineageOutboxStore(env.DVT_PG_SCHEMA, withClient);

  const sink = new HttpOpenLineageSink({
    apiUrl: env.DVT_LINEAGE_API_URL,
    namespace: env.DVT_LINEAGE_NAMESPACE,
    ...(env.DVT_LINEAGE_API_TOKEN
      ? { headers: { authorization: `Bearer ${env.DVT_LINEAGE_API_TOKEN}` } }
      : {}),
  });

  return {
    stateStore,
    lineageStore,
    sink,
    async close(): Promise<void> {
      await stateStore.close();
      await pool.end();
    },
  };
}

function createWithClient(pool: Pool) {
  return async <T>(fn: (client: PoolClient) => Promise<T>): Promise<T> => {
    const client = await pool.connect();
    try {
      return await fn(client);
    } finally {
      client.release();
    }
  };
}
