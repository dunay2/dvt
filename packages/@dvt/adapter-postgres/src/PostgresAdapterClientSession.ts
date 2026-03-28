/**
 * @file packages/@dvt/adapter-postgres/src/PostgresAdapterClientSession.ts
 * @baseline ADR-0031: Storage Adapter Tenant Isolation Strategy
 * @decision Encapsulate pool-client lifecycle, tx boundaries and abort semantics outside the facade adapter
 * @consequence PostgresStateStoreAdapter remains focused on contract composition instead of connection orchestration
 * @version 1.0.0
 * @date 2026-03-28
 */
import type { Pool, PoolClient } from 'pg';

import {
  beginTransactionSql,
  commitTransactionSql,
  rollbackTransactionSql,
  setLocalStatementTimeoutSql,
} from './PostgresAdapterClientSessionSql.js';

export class PostgresAdapterClientSession {
  private readonly activeClients = new Set<PoolClient>();
  private abortPendingOperationsRequested = false;

  constructor(
    private readonly pool: Pool,
    private readonly statementTimeoutMs: number
  ) {}

  hasActiveClients(): boolean {
    return this.activeClients.size > 0;
  }

  async close(ownsPool: boolean): Promise<void> {
    await this.abortPendingOperations();
    if (ownsPool) {
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

  async withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.connect();
    try {
      await client.query(beginTransactionSql());
      if (this.statementTimeoutMs > 0) {
        await client.query(setLocalStatementTimeoutSql(), [this.statementTimeoutMs]);
      }
      const result = await fn(client);
      await client.query(commitTransactionSql());
      return result;
    } catch (error: unknown) {
      const operationError = asError(error);
      try {
        await client.query(rollbackTransactionSql());
      } catch (rollbackError: unknown) {
        throw createTransactionRollbackError(operationError, rollbackError);
      }
      throw operationError;
    } finally {
      this.releaseClient(client);
    }
  }

  async withClient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.connect();
    try {
      return await fn(client);
    } finally {
      this.releaseClient(client);
    }
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

function createPendingOperationsAbortedError(): Error {
  const error = new Error('PENDING_OPERATIONS_ABORTED');
  error.name = 'AbortError';
  return error;
}

function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

function createTransactionRollbackError(operationError: Error, rollbackError: unknown): Error {
  const wrapped = new Error('TRANSACTION_ROLLBACK_FAILED');
  wrapped.name = 'PostgresTransactionError';
  (wrapped as Error & { cause?: unknown }).cause = operationError;
  (wrapped as Error & { rollbackCause?: unknown }).rollbackCause = rollbackError;
  return wrapped;
}
