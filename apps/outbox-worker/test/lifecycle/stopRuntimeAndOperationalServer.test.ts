import { describe, it, expect } from 'vitest';

import { stopRuntimeAndOperationalServer } from '../../src/lifecycle/stopRuntimeAndOperationalServer.js';
import type { OutboxWorkerRuntimeLogger } from '../../src/runtime/OutboxWorkerRuntime.js';

function makeLogger(): {
  logger: OutboxWorkerRuntimeLogger;
  entries: Array<{ level: 'error'; msg?: string; data: Record<string, unknown> }>;
} {
  const entries: Array<{ level: 'error'; msg?: string; data: Record<string, unknown> }> = [];

  return {
    logger: {
      info: () => {},
      warn: () => {},
      error(data, msg) {
        entries.push(msg === undefined ? { level: 'error', data } : { level: 'error', data, msg });
      },
    },
    entries,
  };
}

describe('stopRuntimeAndOperationalServer', () => {
  it('still stops the admin server after runtime stop fails', async () => {
    const calls: string[] = [];
    const { logger, entries } = makeLogger();

    await stopRuntimeAndOperationalServer({
      runtime: {
        stop: async () => {
          calls.push('runtime.stop');
          throw new Error('synthetic runtime stop failure');
        },
      },
      operationalServer: {
        stop: async () => {
          calls.push('operationalServer.stop');
        },
      },
      logger,
      primaryError: new Error('synthetic tick failure'),
    });

    expect(calls).toEqual(['runtime.stop', 'operationalServer.stop']);
    expect(entries.length).toBe(1);
    expect(entries[0]?.msg).toBe('outbox worker cleanup failed while handling a primary failure');
  });

  it('surfaces cleanup failures when there is no primary error', async () => {
    const calls: string[] = [];
    const { logger } = makeLogger();

    await expect(() =>
      stopRuntimeAndOperationalServer({
        runtime: {
          stop: async () => {
            calls.push('runtime.stop');
            throw new Error('synthetic runtime stop failure');
          },
        },
        operationalServer: {
          stop: async () => {
            calls.push('operationalServer.stop');
            throw new Error('synthetic admin stop failure');
          },
        },
        logger,
        primaryError: null,
      })
    ).rejects.toThrow(AggregateError);

    expect(calls).toEqual(['runtime.stop', 'operationalServer.stop']);
  });

  it('skips runtime cleanup when no runtime owner was started', async () => {
    const calls: string[] = [];
    const { logger } = makeLogger();

    await stopRuntimeAndOperationalServer({
      runtime: null,
      operationalServer: {
        stop: async () => {
          calls.push('operationalServer.stop');
        },
      },
      logger,
      primaryError: null,
    });

    expect(calls).toEqual(['operationalServer.stop']);
  });

  it('logs structured cleanup errors without object stringification', async () => {
    const { logger, entries } = makeLogger();

    await stopRuntimeAndOperationalServer({
      runtime: {
        stop: async () => {
          throw { code: 'RUNTIME_STOP_FAILED', retryable: false };
        },
      },
      operationalServer: {
        stop: async () => {},
      },
      logger,
      primaryError: new Error('synthetic primary failure'),
    });

    expect(entries.length).toBe(1);
    const cleanupErrors = entries[0]?.data.cleanupErrors;
    expect(cleanupErrors).toEqual([
      {
        message: '{"code":"RUNTIME_STOP_FAILED","retryable":false}',
        name: 'UnknownError',
      },
    ]);
  });

  it('logs primitive cleanup failures while handling a primary error', async () => {
    const { logger, entries } = makeLogger();

    await stopRuntimeAndOperationalServer({
      runtime: {
        stop: async () => {
          throw false;
        },
      },
      operationalServer: {
        stop: async () => {},
      },
      logger,
      primaryError: new Error('synthetic primary failure'),
    });

    expect(entries.length).toBe(1);
    const cleanupErrors = entries[0]?.data.cleanupErrors;
    expect(cleanupErrors).toEqual([
      {
        message: 'false',
        name: 'UnknownError',
      },
    ]);
  });
});
