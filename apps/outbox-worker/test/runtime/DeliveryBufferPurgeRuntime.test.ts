import { describe, expect, it, vi } from 'vitest';

import { DeliveryBufferPurgeRuntime } from '../../src/runtime/DeliveryBufferPurgeRuntime.js';
import type { DeliveryBufferPurgeRuntimeLogger } from '../../src/runtime/DeliveryBufferPurgeRuntime.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildLogger(): DeliveryBufferPurgeRuntimeLogger & {
  infoMessages: string[];
  errorMessages: string[];
} {
  const infoMessages: string[] = [];
  const errorMessages: string[] = [];
  return {
    infoMessages,
    errorMessages,
    info(_data, msg) {
      if (msg) infoMessages.push(msg);
    },
    error(_data, msg) {
      if (msg) errorMessages.push(msg);
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DeliveryBufferPurgeRuntime', () => {
  it('calls purge immediately on start and resolves after stop', async () => {
    let purgeCallCount = 0;
    const purge = async (): Promise<void> => {
      purgeCallCount += 1;
    };
    const logger = buildLogger();
    const runtime = new DeliveryBufferPurgeRuntime(purge, 60_000, logger);

    const controller = new AbortController();
    const startPromise = runtime.start(controller.signal);

    // Give the microtask queue a turn so the first purge runs.
    await new Promise((r) => setTimeout(r, 10));
    expect(purgeCallCount).toBeGreaterThanOrEqual(1);

    await runtime.stop();
    await startPromise;

    expect(logger.infoMessages).toContain('delivery buffer purge runtime started');
    expect(logger.infoMessages).toContain('delivery buffer purge runtime stopped');
  });

  it('resolves start() immediately when signal is already aborted', async () => {
    const purge = vi.fn().mockResolvedValue(undefined);
    const logger = buildLogger();
    const runtime = new DeliveryBufferPurgeRuntime(purge, 60_000, logger);

    const controller = new AbortController();
    controller.abort();

    await runtime.start(controller.signal);

    expect(purge).not.toHaveBeenCalled();
  });

  it('stops when the abort signal fires', async () => {
    const purge = vi.fn().mockResolvedValue(undefined);
    const logger = buildLogger();
    const runtime = new DeliveryBufferPurgeRuntime(purge, 60_000, logger);

    const controller = new AbortController();
    const startPromise = runtime.start(controller.signal);

    await new Promise((r) => setTimeout(r, 10));
    controller.abort();
    await startPromise;

    expect(logger.infoMessages).toContain('delivery buffer purge runtime stopped');
  });

  it('returns same promise when start() is called twice', async () => {
    const purge = vi.fn().mockResolvedValue(undefined);
    const logger = buildLogger();
    const runtime = new DeliveryBufferPurgeRuntime(purge, 60_000, logger);

    const p1 = runtime.start();
    const p2 = runtime.start();
    expect(p1).toBe(p2);

    await runtime.stop();
    await p1;
  });

  it('stop() is a no-op when runtime was never started', async () => {
    const purge = vi.fn().mockResolvedValue(undefined);
    const logger = buildLogger();
    const runtime = new DeliveryBufferPurgeRuntime(purge, 60_000, logger);

    await expect(runtime.stop()).resolves.toBeUndefined();
    expect(purge).not.toHaveBeenCalled();
  });

  it('continues loop after purge throws', async () => {
    let callCount = 0;
    const purge = async (): Promise<void> => {
      callCount += 1;
      if (callCount === 1) throw new Error('transient failure');
    };
    const logger = buildLogger();
    // Use a very short interval so the second call fires quickly.
    const runtime = new DeliveryBufferPurgeRuntime(purge, 5, logger);

    const startPromise = runtime.start();

    // Wait enough time for at least 2 purge calls.
    await new Promise((r) => setTimeout(r, 50));
    await runtime.stop();
    await startPromise;

    expect(callCount).toBeGreaterThanOrEqual(2);
    expect(logger.errorMessages).toContain('delivery buffer purge cycle failed');
  });

  it('stop() resolves even if currently inside purge', async () => {
    let resolveCurrentPurge!: () => void;
    const purge = (): Promise<void> =>
      new Promise<void>((resolve) => {
        resolveCurrentPurge = resolve;
      });

    const logger = buildLogger();
    const runtime = new DeliveryBufferPurgeRuntime(purge, 60_000, logger);
    const startPromise = runtime.start();

    // Wait for purge to be entered.
    await new Promise((r) => setTimeout(r, 10));

    const stopPromise = runtime.stop();
    // Unblock the in-flight purge.
    resolveCurrentPurge();

    await Promise.all([stopPromise, startPromise]);
    expect(logger.infoMessages).toContain('delivery buffer purge runtime stopped');
  });
});
