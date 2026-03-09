import assert from 'node:assert/strict';
import test from 'node:test';

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
        entries.push({ level: 'error', data, msg });
      },
    },
    entries,
  };
}

await test('stopRuntimeAndOperationalServer still stops the admin server after runtime stop fails', async () => {
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

  assert.deepEqual(calls, ['runtime.stop', 'operationalServer.stop']);
  assert.equal(entries.length, 1);
  assert.equal(entries[0]?.msg, 'outbox worker cleanup failed while handling a primary failure');
});

await test('stopRuntimeAndOperationalServer surfaces cleanup failures when there is no primary error', async () => {
  const calls: string[] = [];
  const { logger } = makeLogger();

  await assert.rejects(
    () =>
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
      }),
    AggregateError
  );

  assert.deepEqual(calls, ['runtime.stop', 'operationalServer.stop']);
});
