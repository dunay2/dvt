/** @ownedConcern Characterize native resource ownership using controlled pg ports, not provider integration. */
import assert from 'node:assert/strict';

import { beforeEach, describe, it, vi } from 'vitest';

const fake = vi.hoisted(() => {
  const events: string[] = [];
  let onError: (() => void) | undefined;
  const field = {
    name: 'id',
    tableID: 123,
    columnID: 1,
    dataTypeID: 20,
    dataTypeSize: 8,
    dataTypeModifier: -1,
    format: 'text',
  };
  const connect = vi.fn<() => Promise<void>>();
  const end = vi.fn<() => Promise<void>>();
  const close = vi.fn<() => Promise<void>>();
  const command = vi.fn<(sql: string) => Promise<unknown>>();
  const native = {
    read: (
      _count: number,
      callback: (error: Error | null, rows: unknown[][], result: object) => void
    ) => {
      events.push('READ');
      callback(null, [], { fields: [field], rows: [] });
    },
    close,
  };
  const Cursor = vi.fn(() => native);
  const Client = vi.fn(() => ({
    connect,
    end,
    on: (_event: string, listener: () => void) => {
      onError = listener;
    },
    removeListener: () => {
      onError = undefined;
      events.push('REMOVE_LISTENER');
    },
    query: (query: unknown) => {
      if (query === native) {
        events.push('OPEN_CURSOR');
        return native;
      }
      if (typeof query !== 'string') return Promise.resolve({ fields: [field], rows: [] });
      events.push(query);
      return command(query);
    },
  }));
  return {
    events,
    connect,
    end,
    close,
    command,
    Client,
    Cursor,
    failConnection: () => {
      onError?.();
    },
    hasListener: () => onError !== undefined,
  };
});
vi.mock('pg', () => ({ Client: fake.Client }));
vi.mock('pg-cursor', () => ({ default: fake.Cursor }));

import { PostgresRemoteDatasetReader } from '../../src/infrastructure/postgres/PostgresRemoteDatasetReader.js';

const input = (): Parameters<PostgresRemoteDatasetReader['withCursor']>[0] => ({
  target: {
    type: 'postgres' as const,
    database: 'dvt_test',
    objectId: 'relation/dvt_test/public/data',
    credentialRef: 'postgres:test',
  },
  access: {
    signal: new globalThis.AbortController().signal,
    checkpoint: async () => undefined,
    beforePromotion: async () => undefined,
  },
  limits: { maxRows: 10, maxLogicalBytes: 1000 },
  timeoutMs: 5000,
});
const reader = (): PostgresRemoteDatasetReader =>
  new PostgresRemoteDatasetReader({ resolveCredential: async () => 'postgresql://test' });
const transactionEvents = (): string[] =>
  fake.events.filter((value) =>
    ['CLOSE', 'COMMIT', 'ROLLBACK', 'END', 'REMOVE_LISTENER'].includes(value)
  );
const command = async (sql: string): Promise<unknown> => {
  if (sql === 'select current_database() as database') return { rows: [{ database: 'dvt_test' }] };
  if (sql.includes('has_table_privilege')) return { rows: [{ relation_kind: 'r' }] };
  if (sql.includes('c.oid::text'))
    return { rows: [{ oid: '123', inherited: false, partitioned: false }] };
  if (sql.includes('FROM pg_attribute'))
    return { rows: [{ attnum: 1, name: 'id', oid: 20, nullable: false }] };
  return { rows: [] };
};
beforeEach(() => {
  fake.events.length = 0;
  vi.clearAllMocks();
  fake.connect.mockImplementation(async () => {
    fake.events.push('CONNECT');
  });
  fake.close.mockImplementation(async () => {
    fake.events.push('CLOSE');
  });
  fake.end.mockImplementation(async () => {
    fake.events.push('END');
  });
  fake.command.mockImplementation(command);
});

describe('scoped native PostgreSQL cleanup', () => {
  it('returns a value only after cursor close, read transaction commit and client end', async () => {
    assert.equal(
      await reader().withCursor(input(), async (cursor) => {
        assert.equal((await cursor.read(1)).endOfSource, true);
        assert.ok(!fake.events.includes('COMMIT'));
        return 'done';
      }),
      'done'
    );
    assert.deepEqual(transactionEvents(), ['CLOSE', 'COMMIT', 'END', 'REMOVE_LISTENER']);
    assert.equal(fake.hasListener(), false);
  });
  it('preserves a consumer failure while closing and rolling back exactly once', async () => {
    const failure = new Error('consumer failed');
    await assert.rejects(
      reader().withCursor(input(), async () => {
        throw failure;
      }),
      (error) => error === failure
    );
    assert.deepEqual(transactionEvents(), ['CLOSE', 'ROLLBACK', 'END', 'REMOVE_LISTENER']);
  });
  it('rolls back and ends even when closing the cursor fails', async () => {
    fake.close.mockImplementation(async () => {
      fake.events.push('CLOSE');
      throw new Error('private provider detail');
    });
    await assert.rejects(
      reader().withCursor(input(), async () => 'not returned'),
      /CLEANUP_FAILED/u
    );
    assert.deepEqual(transactionEvents(), ['CLOSE', 'ROLLBACK', 'END', 'REMOVE_LISTENER']);
  });
  it.each(['COMMIT', 'ROLLBACK'])('ends the client after a failed %s', async (failure) => {
    fake.command.mockImplementation(async (sql) => {
      if (sql === failure) throw new Error('private provider detail');
      return command(sql);
    });
    await assert.rejects(
      reader().withCursor(input(), async () => {
        if (failure === 'ROLLBACK') throw new Error('consumer failed');
        return 'not returned';
      }),
      /CLEANUP_FAILED/u
    );
    assert.deepEqual(transactionEvents(), ['CLOSE', failure, 'END', 'REMOVE_LISTENER']);
  });
  it('does not return success if the client cannot close', async () => {
    fake.end.mockImplementation(async () => {
      fake.events.push('END');
      throw new Error('private');
    });
    await assert.rejects(
      reader().withCursor(input(), async () => 'not returned'),
      /CLEANUP_FAILED/u
    );
    assert.equal(fake.hasListener(), false);
  });
  it('never commits after a connection error during cursor close', async () => {
    fake.close.mockImplementation(async () => {
      fake.events.push('CLOSE');
      fake.failConnection();
    });
    await assert.rejects(
      reader().withCursor(input(), async () => 'not returned'),
      /CLEANUP_FAILED/u
    );
    assert.deepEqual(transactionEvents(), ['CLOSE', 'END', 'REMOVE_LISTENER']);
  });
  it('closes a client whose connection failed without fabricating a transaction', async () => {
    fake.connect.mockRejectedValue(new Error('private'));
    await assert.rejects(
      reader().withCursor(input(), async () => 'not called'),
      /PROVIDER_FAILED/u
    );
    assert.deepEqual(transactionEvents(), ['END', 'REMOVE_LISTENER']);
    assert.equal(fake.Cursor.mock.calls.length, 0);
  });
  it('closes without rollback when BEGIN never succeeded', async () => {
    fake.command.mockImplementation(async (sql) => {
      if (sql.startsWith('BEGIN ')) throw new Error('private');
      return command(sql);
    });
    await assert.rejects(
      reader().withCursor(input(), async () => 'not called'),
      /PROVIDER_FAILED/u
    );
    assert.deepEqual(transactionEvents(), ['END', 'REMOVE_LISTENER']);
  });
  it('does not resolve credentials or open clients when capture permission is rejected', async () => {
    const credentials = { resolveCredential: vi.fn(async () => 'postgresql://test') };
    const request = input();
    request.access.beforePromotion = async () => {
      throw new Error('denied');
    };
    await assert.rejects(
      new PostgresRemoteDatasetReader(credentials).withCursor(request, async () => undefined),
      /ACCESS_REJECTED/u
    );
    assert.equal(credentials.resolveCredential.mock.calls.length, 0);
    assert.equal(fake.Client.mock.calls.length, 0);
  });
});
