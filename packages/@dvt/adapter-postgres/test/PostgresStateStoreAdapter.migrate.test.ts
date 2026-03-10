import { describe, expect, it } from 'vitest';

import { PostgresStateStoreAdapter } from '../src/PostgresStateStoreAdapter.js';

interface Deferred<T> {
  readonly promise: Promise<T>;
  resolve(value: T): void;
  reject(error: Error): void;
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return {
    promise,
    resolve,
    reject,
  };
}

describe('PostgresStateStoreAdapter migration state', () => {
  it('rejects use before migrate() is called', async () => {
    const adapter = new PostgresStateStoreAdapter({
      pool: {
        connect: async () => {
          throw new Error('connect should not be reached before migrate');
        },
      } as never,
    });

    await expect(adapter.listPending(0)).rejects.toThrow(/MIGRATE_NOT_CALLED/);
  });

  it('treats assumeSchemaReady as ready without seeding a synthetic migrate promise', async () => {
    let connectCalls = 0;
    const adapter = new PostgresStateStoreAdapter({
      pool: {
        connect: async () => {
          connectCalls += 1;
          throw new Error('connect should not be called when limit is zero');
        },
      } as never,
      assumeSchemaReady: true,
    });

    await expect(adapter.listPending(0)).resolves.toEqual([]);
    expect(
      (adapter as unknown as { migratePromise: Promise<void> | null }).migratePromise
    ).toBeNull();
    expect(connectCalls).toBe(0);
  });

  it('reports MIGRATE_IN_PROGRESS until a pending migrate() settles', async () => {
    const connectDeferred = createDeferred<never>();
    const adapter = new PostgresStateStoreAdapter({
      pool: {
        connect: async () => connectDeferred.promise,
      } as never,
    });

    const migratePromise = adapter.migrate();

    await expect(adapter.listPending(0)).rejects.toThrow(/MIGRATE_IN_PROGRESS/);

    connectDeferred.reject(new Error('synthetic migrate failure'));

    await expect(migratePromise).rejects.toThrow(/synthetic migrate failure/);
    await expect(adapter.listPending(0)).rejects.toThrow(/MIGRATE_NOT_CALLED/);
  });
});
