/** Owned concern: own the PostgreSQL resources used by object-file ingestion. */
import type { Pool } from 'pg';

import { PostgresAdapterClientSession } from './PostgresAdapterClientSession.js';
import { resolvePostgresConnectionString } from './PostgresAdapterConnectionString.js';
import { POSTGRES_ADAPTER_RUNTIME_CONSTANTS as C } from './PostgresAdapterConstants.js';
import {
  PostgresObjectFileLoader,
  type PostgresObjectFileLoadInput,
  type PostgresObjectFileLoadResult,
} from './PostgresObjectFileLoader.js';
import { createObservedPostgresPool } from './PostgresPoolErrorPolicy.js';

export interface PostgresObjectFileLoadingCapabilityConfig {
  readonly connectionString?: string;
  readonly pool?: Pool;
  readonly statementTimeoutMs?: number;
  readonly queryTimeoutMs?: number;
}

export class PostgresObjectFileLoadingCapability {
  private readonly session: PostgresAdapterClientSession;
  private readonly loader: PostgresObjectFileLoader;
  private readonly ownsPool: boolean;

  public constructor(config: PostgresObjectFileLoadingCapabilityConfig) {
    const statementTimeoutMs =
      config.statementTimeoutMs ??
      Number(process.env[C.statementTimeoutEnvVar] ?? C.defaultTimeoutMs);
    const queryTimeoutMs =
      config.queryTimeoutMs ?? Number(process.env[C.queryTimeoutEnvVar] ?? C.defaultTimeoutMs);
    const pool =
      config.pool ??
      createObservedPostgresPool({
        connectionString: resolvePostgresConnectionString(config.connectionString),
        statement_timeout: statementTimeoutMs,
        query_timeout: queryTimeoutMs,
      });

    this.ownsPool = config.pool === undefined;
    this.session = new PostgresAdapterClientSession(pool, statementTimeoutMs);
    this.loader = new PostgresObjectFileLoader(this.session);
  }

  public load(input: PostgresObjectFileLoadInput): Promise<PostgresObjectFileLoadResult> {
    return this.loader.load(input);
  }

  public close(): Promise<void> {
    return this.session.close(this.ownsPool);
  }
}
