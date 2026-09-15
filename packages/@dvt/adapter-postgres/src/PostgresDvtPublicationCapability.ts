/**
 * Owned concern: own PostgreSQL resources for one DVT publication capability.
 * @baseline ADR-0003: Execution Model
 * @decision Compose pool, transactional session and stable-table publisher behind one lifecycle.
 * @consequence Temporal can execute publications without owning PostgreSQL resource details.
 * @version 1.0.0
 */
import type { Pool } from 'pg';

import { PostgresAdapterClientSession } from './PostgresAdapterClientSession.js';
import type {
  PostgresDvtStableTablePublishInput,
  PostgresDvtStableTablePublishResult,
} from './PostgresDvtPublicationTypes.js';
import { PostgresDvtStableTablePublisher } from './PostgresDvtStableTablePublisher.js';
import { createObservedPostgresPool } from './PostgresPoolErrorPolicy.js';

export interface PostgresDvtPublicationCapabilityConfig {
  readonly connectionString?: string;
  readonly pool?: Pool;
  readonly statementTimeoutMs?: number;
  readonly queryTimeoutMs?: number;
}

export class PostgresDvtPublicationCapability {
  private readonly session: PostgresAdapterClientSession;
  private readonly publisher: PostgresDvtStableTablePublisher;
  private readonly ownsPool: boolean;

  public constructor(config: PostgresDvtPublicationCapabilityConfig) {
    const statementTimeoutMs = config.statementTimeoutMs ?? 30_000;
    const pool =
      config.pool ??
      createObservedPostgresPool({
        connectionString: config.connectionString,
        statement_timeout: statementTimeoutMs,
        query_timeout: config.queryTimeoutMs ?? 30_000,
      });
    this.ownsPool = config.pool === undefined;
    this.session = new PostgresAdapterClientSession(pool, statementTimeoutMs);
    this.publisher = new PostgresDvtStableTablePublisher(this.session);
  }

  public publish(
    input: PostgresDvtStableTablePublishInput
  ): Promise<PostgresDvtStableTablePublishResult> {
    return this.publisher.publish(input);
  }

  public close(): Promise<void> {
    return this.session.close(this.ownsPool);
  }
}
