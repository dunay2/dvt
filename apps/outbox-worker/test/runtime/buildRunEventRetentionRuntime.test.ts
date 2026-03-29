import { describe, expect, it, vi } from 'vitest';

import { __internal } from '../../src/runtime/buildRunEventRetentionRuntime.js';
import type { PoolClient } from 'pg';

function createQuerySpy() {
  return vi
    .fn<(queryConfig: unknown) => Promise<{ rows: unknown[] }>>()
    .mockResolvedValue({ rows: [] });
}

describe('buildRunEventRetentionRuntime internals', () => {
  it('forwards abort signal in query config for string queries', async () => {
    const signal = new globalThis.AbortController().signal;
    const query = createQuerySpy();
    const client = { query } as unknown as PoolClient;
    const abortAwareClient = __internal.createAbortAwareClient(client, signal);

    await abortAwareClient.query('SELECT 1');

    const firstCallArg = query.mock.calls.at(0)?.[0];
    expect(firstCallArg).toBeDefined();
    const typedArg = firstCallArg as { text: string; signal?: globalThis.AbortSignal };
    expect(typedArg.text).toBe('SELECT 1');
    expect(typedArg.signal).toBe(signal);
  });

  it('forwards abort signal in query config for object queries', async () => {
    const signal = new globalThis.AbortController().signal;
    const query = createQuerySpy();
    const client = { query } as unknown as PoolClient;
    const abortAwareClient = __internal.createAbortAwareClient(client, signal);

    await abortAwareClient.query({ text: 'SELECT 1', values: [1] });

    const firstCallArg = query.mock.calls.at(0)?.[0];
    expect(firstCallArg).toBeDefined();
    const typedArg = firstCallArg as {
      text: string;
      values?: readonly unknown[];
      signal?: globalThis.AbortSignal;
    };
    expect(typedArg.text).toBe('SELECT 1');
    expect(typedArg.values).toEqual([1]);
    expect(typedArg.signal).toBe(signal);
  });

  it('throws AbortError when signal is already aborted', async () => {
    const controller = new globalThis.AbortController();
    controller.abort();
    const query = createQuerySpy();
    const client = { query } as unknown as PoolClient;
    const abortAwareClient = __internal.createAbortAwareClient(client, controller.signal);

    expect(() => abortAwareClient.query('SELECT 1')).toThrowError(
      /run-event retention cycle aborted/
    );
    expect(query).not.toHaveBeenCalled();
  });
});
