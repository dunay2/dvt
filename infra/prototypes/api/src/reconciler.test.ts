import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { IntentReconciler } from './reconciler';
import { createRuntimeIntegration } from './runtimeIntegration';

describe('IntentReconciler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('runs sweeps without overlap and supports clean stop', async () => {
    let calls = 0;
    let maxConcurrent = 0;
    let concurrent = 0;

    const service = {
      reconcileOrphanedIntents: vi.fn(async () => {
        calls += 1;
        concurrent += 1;
        maxConcurrent = Math.max(maxConcurrent, concurrent);
        await Promise.resolve();
        concurrent -= 1;
        return { inspected: 1, expired: [], cancelled: [], cancelFailed: [] };
      }),
    };
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const metrics = { increment: vi.fn(), timing: vi.fn(), gauge: vi.fn() };

    const reconciler = new IntentReconciler(service, logger, metrics, { intervalMs: 100 });
    reconciler.start();

    await vi.advanceTimersByTimeAsync(350);
    await reconciler.stop();

    expect(calls).toBeGreaterThanOrEqual(3);
    expect(maxConcurrent).toBe(1);
  });

  it('backs off on infrastructure errors and recovers on success', async () => {
    const service = {
      reconcileOrphanedIntents: vi
        .fn()
        .mockRejectedValueOnce(Object.assign(new Error('db down'), { code: '08006' }))
        .mockResolvedValue({ inspected: 1, expired: [], cancelled: [], cancelFailed: [] }),
    };
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const metrics = { increment: vi.fn(), timing: vi.fn(), gauge: vi.fn() };

    const reconciler = new IntentReconciler(service, logger, metrics, {
      intervalMs: 100,
      errorBackoffMsBase: 200,
      errorBackoffMsMax: 1000,
      jitterRatio: 0,
    });
    reconciler.start();

    await vi.advanceTimersByTimeAsync(1); // first tick
    await vi.advanceTimersByTimeAsync(200); // backoff tick
    await reconciler.stop();

    expect(service.reconcileOrphanedIntents).toHaveBeenCalledTimes(2);
    expect(metrics.gauge).toHaveBeenCalledWith('dvt.intent.reconcile.backoff_ms', 200);
  });
});

describe('Runtime integration', () => {
  it('provides explicit start/stop lifecycle', async () => {
    vi.useFakeTimers();
    const service = {
      reconcileOrphanedIntents: vi
        .fn()
        .mockResolvedValue({ inspected: 0, expired: [], cancelled: [], cancelFailed: [] }),
    };
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const metrics = { increment: vi.fn(), timing: vi.fn(), gauge: vi.fn() };

    const runtime = createRuntimeIntegration(service, logger, metrics, { intervalMs: 50 });
    runtime.start();
    await vi.advanceTimersByTimeAsync(120);
    await runtime.stop();

    expect(service.reconcileOrphanedIntents).toHaveBeenCalled();
    vi.useRealTimers();
  });
});
