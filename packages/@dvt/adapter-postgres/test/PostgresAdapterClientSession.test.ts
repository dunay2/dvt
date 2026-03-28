import { describe, expect, it, vi } from 'vitest';

import { PostgresAdapterClientSession } from '../src/PostgresAdapterClientSession.js';

const DEFAULT_STATEMENT_TIMEOUT_MS = 1_000;
const DISABLED_STATEMENT_TIMEOUT_MS = 0;

interface FakeClient {
  query: ReturnType<typeof vi.fn>;
  release: ReturnType<typeof vi.fn>;
}

function createPool(client: FakeClient): {
  connect: ReturnType<typeof vi.fn>;
  end: ReturnType<typeof vi.fn>;
} {
  return {
    connect: vi.fn(async () => client),
    end: vi.fn(async () => undefined),
  };
}

function createClient(): FakeClient {
  return {
    query: vi.fn(async () => ({ rows: [], rowCount: 0 })),
    release: vi.fn(),
  };
}

describe('PostgresAdapterClientSession', () => {
  it('commits transaction on happy path and releases client', async () => {
    const client = createClient();
    const pool = createPool(client);
    const session = new PostgresAdapterClientSession(pool as never, DEFAULT_STATEMENT_TIMEOUT_MS);

    const result = await session.withTransaction(async () => 'ok');

    expect(result).toBe('ok');
    expect(client.query).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(client.query).toHaveBeenNthCalledWith(2, 'SET LOCAL statement_timeout = $1', [
      DEFAULT_STATEMENT_TIMEOUT_MS,
    ]);
    expect(client.query).toHaveBeenNthCalledWith(3, 'COMMIT');
    expect(client.release).toHaveBeenCalledWith(false);
  });

  it('rolls back and rethrows operation error when unit-of-work fails', async () => {
    const client = createClient();
    const pool = createPool(client);
    const session = new PostgresAdapterClientSession(pool as never, DISABLED_STATEMENT_TIMEOUT_MS);
    const operationError = new Error('synthetic-operation-failure');

    await expect(
      session.withTransaction(async () => {
        throw operationError;
      })
    ).rejects.toBe(operationError);

    expect(client.query).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(client.query).toHaveBeenNthCalledWith(2, 'ROLLBACK');
    expect(client.release).toHaveBeenCalledWith(false);
  });

  it('raises PostgresTransactionError when rollback fails and preserves both causes', async () => {
    const client = createClient();
    const pool = createPool(client);
    const session = new PostgresAdapterClientSession(pool as never, DISABLED_STATEMENT_TIMEOUT_MS);
    const operationError = new Error('synthetic-operation-failure');
    const rollbackError = new Error('synthetic-rollback-failure');

    client.query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
      .mockRejectedValueOnce(rollbackError); // ROLLBACK

    await expect(
      session.withTransaction(async () => {
        throw operationError;
      })
    ).rejects.toMatchObject({
      name: 'PostgresTransactionError',
      message: 'TRANSACTION_ROLLBACK_FAILED',
      cause: rollbackError,
      operationCause: operationError,
    });

    expect(client.release).toHaveBeenCalledWith(false);
  });

  it('aborts pending operations and blocks new client acquisition', async () => {
    const client = createClient();
    const pool = createPool(client);
    const session = new PostgresAdapterClientSession(pool as never, DISABLED_STATEMENT_TIMEOUT_MS);

    const pending = session.withClient(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      return 'done';
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    session.abortPendingOperations();

    await expect(pending).resolves.toBe('done');
    await expect(session.withClient(async () => 'never')).rejects.toThrow(
      /PENDING_OPERATIONS_ABORTED/
    );
    expect(client.release).toHaveBeenCalledWith(true);
  });
});
