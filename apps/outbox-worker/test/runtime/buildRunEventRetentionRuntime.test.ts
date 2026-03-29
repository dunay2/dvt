import type { PoolClient } from 'pg';
import { describe, expect, it, vi } from 'vitest';

import { __internal } from '../../src/runtime/buildRunEventRetentionRuntime.js';

function createQuerySpy(): ReturnType<
  typeof vi.fn<(queryConfig: unknown) => Promise<{ rows: unknown[] }>>
> {
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

  it('executes rollback on raw client even when cycle signal is aborted', async () => {
    const controller = new globalThis.AbortController();
    const query = vi.fn(async (queryConfig: unknown) => {
      if (typeof queryConfig === 'string') {
        return { rows: [] };
      }
      const typed = queryConfig as { text: string; signal?: globalThis.AbortSignal };
      if (typed.signal?.aborted) {
        throw new Error('ABORTED_QUERY');
      }
      return { rows: [] };
    });
    const client = {
      query,
      release: vi.fn(),
    } as unknown as PoolClient;
    const logger = {
      info: vi.fn(),
      error: vi.fn(),
    };

    await expect(
      __internal.executeAbortAwareTransaction(
        client,
        controller.signal,
        async () => {
          controller.abort();
          throw new Error('CYCLE_FAILED');
        },
        logger
      )
    ).rejects.toThrow(/CYCLE_FAILED/);

    const callArgs = query.mock.calls.map((call) => call[0]);
    expect(callArgs).toContain('ROLLBACK');
    expect(logger.error).not.toHaveBeenCalled();
  });
});
