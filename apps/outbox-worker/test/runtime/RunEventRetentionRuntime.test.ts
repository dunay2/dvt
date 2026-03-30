import { setTimeout as sleep } from 'node:timers/promises';

import { describe, expect, it } from 'vitest';

import { RunEventRetentionRuntime } from '../../src/runtime/RunEventRetentionRuntime.js';

function makeLogger(): {
  logger: {
    info: () => void;
    error: () => void;
  };
  getErrorCount: () => number;
} {
  let errorCount = 0;
  return {
    logger: {
      info: () => {},
      error: () => {
        errorCount += 1;
      },
    },
    getErrorCount: () => errorCount,
  };
}

describe('RunEventRetentionRuntime', () => {
  it('aborts an in-flight cycle when stop is called', async () => {
    const loggerState = makeLogger();
    let cycleStarted = false;
    let abortObserved = false;

    const runtime = new RunEventRetentionRuntime(
      async (signal) => {
        cycleStarted = true;
        await new Promise<void>((_resolve, reject) => {
          signal.addEventListener(
            'abort',
            () => {
              abortObserved = true;
              const error = new Error('synthetic cycle abort');
              error.name = 'AbortError';
              reject(error);
            },
            { once: true }
          );
        });
      },
      60_000,
      0,
      loggerState.logger
    );

    const loop = runtime.start();
    await waitFor(() => cycleStarted);
    await runtime.stop();
    await loop;

    expect(abortObserved).toBe(true);
    expect(loggerState.getErrorCount()).toBe(0);
  });

  it('stops quickly while waiting between cycles', async () => {
    const loggerState = makeLogger();
    let cycles = 0;
    const runtime = new RunEventRetentionRuntime(
      async () => {
        cycles += 1;
      },
      60_000,
      0,
      loggerState.logger
    );

    const loop = runtime.start();
    await waitFor(() => cycles > 0);

    const startedAt = Date.now();
    await runtime.stop();
    await loop;
    const elapsedMs = Date.now() - startedAt;

    expect(elapsedMs).toBeLessThan(1_000);
    expect(loggerState.getErrorCount()).toBe(0);
  });

  it('does not run a cycle before the configured initial delay', async () => {
    const loggerState = makeLogger();
    let cycles = 0;
    const runtime = new RunEventRetentionRuntime(
      async () => {
        cycles += 1;
      },
      60_000,
      200,
      loggerState.logger
    );

    const loop = runtime.start();
    await sleep(50);
    expect(cycles).toBe(0);

    await runtime.stop();
    await loop;
    expect(loggerState.getErrorCount()).toBe(0);
  });

  it('stops quickly during initial delay when stop is requested immediately', async () => {
    const loggerState = makeLogger();
    let cycles = 0;
    const runtime = new RunEventRetentionRuntime(
      async () => {
        cycles += 1;
      },
      60_000,
      30_000,
      loggerState.logger
    );

    const loop = runtime.start();
    const startedAt = Date.now();
    await runtime.stop();
    await loop;
    const elapsedMs = Date.now() - startedAt;

    expect(elapsedMs).toBeLessThan(1_000);
    expect(cycles).toBe(0);
    expect(loggerState.getErrorCount()).toBe(0);
  });

  it('reports cycle success/failure hook data', async () => {
    const loggerState = makeLogger();
    const callbacks = {
      started: 0,
      stopped: 0,
      success: [] as Array<{ durationMs: number; archivedUnits: number }>,
      failure: [] as Array<{ durationMs: number; error: unknown }>,
    };
    let cycle = 0;
    const runtime = new RunEventRetentionRuntime(
      async () => {
        cycle += 1;
        if (cycle === 1) {
          return [
            { archiveUnitKey: 'u1', exported: true },
            { archiveUnitKey: 'u2', exported: false },
          ];
        }
        throw new Error('synthetic retention failure');
      },
      5,
      0,
      loggerState.logger,
      {
        onRunEventRetentionStarted: () => {
          callbacks.started += 1;
        },
        onRunEventRetentionStopped: () => {
          callbacks.stopped += 1;
        },
        onRunEventRetentionCycleSucceeded: (details) => {
          callbacks.success.push(details);
        },
        onRunEventRetentionCycleFailed: (details) => {
          callbacks.failure.push(details);
        },
      }
    );

    const loop = runtime.start();
    await waitFor(() => callbacks.success.length > 0);
    await waitFor(() => callbacks.failure.length > 0);
    await runtime.stop();
    await loop;

    expect(callbacks.started).toBe(1);
    expect(callbacks.stopped).toBe(1);
    expect(callbacks.success[0]?.archivedUnits).toBe(1);
    expect(callbacks.success[0]?.durationMs).toBeGreaterThanOrEqual(0);
    expect(callbacks.failure[0]?.durationMs).toBeGreaterThanOrEqual(0);
    expect(callbacks.failure[0]?.error).toBeInstanceOf(Error);
  });
});

async function waitFor(predicate: () => boolean, timeoutMs = 1_000): Promise<void> {
  const startedAt = Date.now();

  while (!predicate()) {
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error('Condition not met before timeout');
    }
    await sleep(10);
  }
}
