/**
 * @file packages/@dvt/adapter-postgres/src/PostgresAdapterClientSession.ts
 * @baseline ADR-0031: Storage Adapter Tenant Isolation Strategy
 * @decision Encapsulate pool-client lifecycle, tx boundaries and abort semantics outside the facade adapter
 * @consequence PostgresStateStoreAdapter remains focused on contract composition instead of connection orchestration
 * @version 1.0.0
 * @date 2026-03-28
 */
import type { Pool, PoolClient } from 'pg';

import { POSTGRES_ADAPTER_CLIENT_SESSION_CONSTANTS as C } from './PostgresAdapterClientSessionConstants.js';
import {
  beginTransactionSql,
  commitTransactionSql,
  rollbackTransactionSql,
  setLocalStatementTimeoutSql,
} from './PostgresAdapterClientSessionSql.js';

export class PostgresAdapterClientSession {
  private readonly activeClients = new Set<PoolClient>();
  private abortPendingOperationsRequested = false;
  private maintenanceModeRequested = false;
  private inFlightClientAcquisitions = 0;

  constructor(
    private readonly pool: Pool,
    private readonly statementTimeoutMs: number
  ) {}

  hasActiveClients(): boolean {
    return this.activeClients.size > 0 || this.inFlightClientAcquisitions > 0;
  }

  async close(ownsPool: boolean): Promise<void> {
    this.abortPendingOperations();
    if (ownsPool) {
      await this.pool.end();
    }
  }

  abortPendingOperations(): void {
    this.abortPendingOperationsRequested = true;
    const clients = [...this.activeClients];
    for (const client of clients) {
      this.releaseClient(client, C.destroyClientOnAbort);
    }
  }

  async withMaintenanceMode<T>(fn: () => Promise<T>): Promise<T> {
    this.beginMaintenanceMode();
    try {
      return await fn();
    } finally {
      this.endMaintenanceMode();
    }
  }

  async withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.connect();
    try {
      await client.query(beginTransactionSql());
      if (this.statementTimeoutMs > C.statementTimeoutDisabledMs) {
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

  private beginMaintenanceMode(): void {
    if (this.maintenanceModeRequested) {
      throw createMaintenanceModeActiveError();
    }
    this.maintenanceModeRequested = true;
  }

  private endMaintenanceMode(): void {
    this.maintenanceModeRequested = false;
  }

  private async connect(): Promise<PoolClient> {
    this.throwIfClientAcquisitionBlocked();
    this.inFlightClientAcquisitions += 1;
    let client: PoolClient;
    try {
      client = await this.pool.connect();
    } finally {
      this.inFlightClientAcquisitions -= 1;
    }
    if (this.abortPendingOperationsRequested) {
      client.release(C.destroyClientOnAbort);
      throw createPendingOperationsAbortedError();
    }
    if (this.maintenanceModeRequested) {
      client.release(C.releaseClientNormally);
      throw createMaintenanceModeActiveError();
    }
    this.activeClients.add(client);
    return client;
  }

  private throwIfClientAcquisitionBlocked(): void {
    if (this.abortPendingOperationsRequested) {
      throw createPendingOperationsAbortedError();
    }
    if (this.maintenanceModeRequested) {
      throw createMaintenanceModeActiveError();
    }
  }

  private releaseClient(client: PoolClient, destroy: boolean = C.releaseClientNormally): void {
    if (!this.activeClients.delete(client)) {
      return;
    }
    client.release(destroy);
  }
}

function createPendingOperationsAbortedError(): Error {
  const error = new Error(C.pendingOperationsAbortedErrorMessage);
  error.name = C.pendingOperationsAbortedErrorName;
  return error;
}

function createMaintenanceModeActiveError(): Error {
  const error = new Error(C.maintenanceModeActiveErrorMessage);
  error.name = C.maintenanceModeActiveErrorName;
  return error;
}

function asError(error: unknown): Error {
  if (error instanceof Error) return error;
  const message = typeof error === 'string' ? error : safeSerializeUnknown(error);
  return new Error(message);
}

function safeSerializeUnknown(error: unknown): string {
  try {
    const seen = new WeakSet<object>();
    return JSON.stringify(error, (_key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular]';
        }
        seen.add(value);
      }
      return value;
    });
  } catch {
    return String(error);
  }
}

function createTransactionRollbackError(operationError: Error, rollbackError: unknown): Error {
  const wrapped = new Error(C.transactionRollbackFailedErrorMessage);
  wrapped.name = C.transactionRollbackFailedErrorName;
  (wrapped as Error & { cause?: unknown }).cause = operationError;
  (wrapped as Error & { operationCause?: unknown }).operationCause = operationError;
  (wrapped as Error & { rollbackCause?: unknown }).rollbackCause = asError(rollbackError);
  return wrapped;
}
