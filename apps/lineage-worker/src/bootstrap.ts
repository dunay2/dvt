import { Pool } from 'pg';

import { PostgresStateStoreAdapter } from '@dvt/adapter-postgres';
import {
  HttpOpenLineageSink,
  type ILineageOutboxStore,
} from '@dvt/traceability-service';

import type { Env } from './env.js';

export interface LineageWorkerBootstrapDeps {
  poolFactory?: (env: Env) => Pool;
}

export interface LineageWorkerBootstrapResult {
  stateStore: PostgresStateStoreAdapter;
  sink: HttpOpenLineageSink;
  getLineageStore(): ILineageOutboxStore;
  close(): Promise<void>;
}

export function buildLineageWorkerBootstrap(
  env: Env,
  deps: LineageWorkerBootstrapDeps = {}
): LineageWorkerBootstrapResult {
  const pool = deps.poolFactory?.(env) ?? new Pool({ connectionString: env.DATABASE_URL });

  const stateStore = new PostgresStateStoreAdapter({
    pool,
    schema: env.DVT_PG_SCHEMA,
    statementTimeoutMs: env.DVT_PG_STATEMENT_TIMEOUT_MS,
    queryTimeoutMs: env.DVT_PG_QUERY_TIMEOUT_MS,
  });

  const sink = new HttpOpenLineageSink({
    apiUrl: env.DVT_LINEAGE_API_URL,
    namespace: env.DVT_LINEAGE_NAMESPACE,
    ...(env.DVT_LINEAGE_API_TOKEN
      ? { headers: { authorization: `Bearer ${env.DVT_LINEAGE_API_TOKEN}` } }
      : {}),
  });

  return {
    stateStore,
    sink,
    getLineageStore(): ILineageOutboxStore {
      return stateStore.getLineageOutboxStore();
    },
    async close(): Promise<void> {
      await stateStore.close();
      await pool.end();
    },
  };
}
