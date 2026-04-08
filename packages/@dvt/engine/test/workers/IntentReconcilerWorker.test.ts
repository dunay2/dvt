/**
 * @file packages/@dvt/engine/test/workers/IntentReconcilerWorker.test.ts
 * @decision Verifies scheduler semantics: no overlap, timeout guard, and infra/backoff behavior
 * @consequence Reconciler runtime behavior remains deterministic under failure conditions
 * @version 1.0.0
 * @date 2026-03-05
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { IRunMaintenanceService } from '../../src/ports/IRunMaintenanceService.js';
import {
  IntentReconcilerWorker,
  type IntentReconcilerWorkerDeps,
  type IntentReconcilerWorkerOptions,
} from '../../src/workers/IntentReconcilerWorker.js';

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function makeMaintenance(
  reconcile: IRunMaintenanceService['reconcileOrphanedIntents']
): IRunMaintenanceService {
  return {
    detectStuckRuns: async () => ({ tenantId: 't', inspected: 0, transitioned: [], skipped: 0 }),
    detectStuckCancellingRuns: async () => ({
      tenantId: 't',
      inspected: 0,
      transitioned: [],
      skipped: 0,
    }),
    reconcileOrphanedIntents: reconcile,
  };
}

function makeLogger(): { info: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> } {
  return {
    info: vi.fn(),
    error: vi.fn(),
  };
}

function makeMetrics(): {
  increment: ReturnType<typeof vi.fn>;
  timing: ReturnType<typeof vi.fn>;
  gauge: ReturnType<typeof vi.fn>;
} {
  return {
    increment: vi.fn(),
    timing: vi.fn(),
    gauge: vi.fn(),
  };
}

function setupTest(
  reconcile: ReturnType<typeof vi.fn>,
  options?: IntentReconcilerWorkerOptions,
  deps?: IntentReconcilerWorkerDeps
): { worker: IntentReconcilerWorker; metrics: ReturnType<typeof makeMetrics> } {
  vi.useFakeTimers();
  const metrics = makeMetrics();
  const worker = new IntentReconcilerWorker(
    makeMaintenance(reconcile),
    makeLogger(),
    metrics,
    options ?? { intervalMs: 20, jitterRatio: 0 },
    deps
  );
  return { worker, metrics };
}

const resultType = (): {
  inspected: number;
  expired: string[];
  resolved: string[];
  cancelled: string[];
  cancelFailed: string[];
  deferred: string[];
} => ({ inspected: 0, expired: [], resolved: [], cancelled: [], cancelFailed: [], deferred: [] });

describe('IntentReconcilerWorker', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('does not overlap ticks while one sweep is in flight', async () => {
    const inFlight = deferred<ReturnType<typeof resultType>>();
    const reconcile = vi.fn().mockImplementation(() => inFlight.promise);
    const { worker } = setupTest(reconcile, { intervalMs: 20, jitterRatio: 0 });

    worker.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(reconcile).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(100);
    expect(reconcile).toHaveBeenCalledTimes(1);

    inFlight.resolve({
      inspected: 1,
      expired: [],
      resolved: [],
      cancelled: [],
      cancelFailed: [],
      deferred: [],
    });
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(20);
    expect(reconcile).toHaveBeenCalledTimes(2);

    await worker.stop();
  });

  it('applies exponential backoff only for infrastructure errors', async () => {
    const error = Object.assign(new Error('db down'), { code: 'ECONNRESET' });
    const reconcile = vi.fn().mockRejectedValueOnce(error).mockResolvedValueOnce(resultType());
    const { worker, metrics } = setupTest(reconcile, {
      intervalMs: 1_000,
      errorBackoffMsBase: 100,
      errorBackoffMsMax: 100,
      jitterRatio: 0,
    });

    worker.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(reconcile).toHaveBeenCalledTimes(1);
    expect(metrics.gauge).toHaveBeenCalledWith('dvt.intent.reconcile.backoff_ms', 100);

    await vi.advanceTimersByTimeAsync(99);
    expect(reconcile).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(reconcile).toHaveBeenCalledTimes(2);

    await worker.stop();
  });

  it('uses normal interval for logic errors', async () => {
    const reconcile = vi
      .fn()
      .mockRejectedValueOnce(new Error('domain failure'))
      .mockResolvedValueOnce(resultType());
    const { worker, metrics } = setupTest(reconcile, {
      intervalMs: 500,
      errorBackoffMsBase: 100,
      errorBackoffMsMax: 100,
      jitterRatio: 0,
    });

    worker.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(reconcile).toHaveBeenCalledTimes(1);
    expect(metrics.gauge).toHaveBeenCalledWith('dvt.intent.reconcile.backoff_ms', 500);

    await vi.advanceTimersByTimeAsync(500);
    expect(reconcile).toHaveBeenCalledTimes(2);

    await worker.stop();
  });

  it('stop waits for in-flight tick and timeout guard releases hung sweeps', async () => {
    const never = deferred<ReturnType<typeof resultType>>();
    const reconcile = vi.fn().mockImplementation(() => never.promise);
    const { worker } = setupTest(reconcile, {
      tickTimeoutMs: 50,
      intervalMs: 1_000,
      jitterRatio: 0,
    });

    worker.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(reconcile).toHaveBeenCalledTimes(1);

    const stopping = worker.stop();
    await vi.advanceTimersByTimeAsync(50);
    await expect(stopping).resolves.toBeUndefined();
  });

  it('resets backoff after a successful sweep following infrastructure errors', async () => {
    const infraError = Object.assign(new Error('db down'), { code: 'ECONNRESET' });
    const reconcile = vi
      .fn()
      .mockRejectedValueOnce(infraError)
      .mockResolvedValueOnce({
        inspected: 1,
        expired: [],
        resolved: [],
        cancelled: [],
        cancelFailed: [],
        deferred: [],
      })
      .mockRejectedValueOnce(infraError);
    const { worker, metrics } = setupTest(reconcile, {
      intervalMs: 500,
      errorBackoffMsBase: 100,
      errorBackoffMsMax: 1_000,
      jitterRatio: 0,
    });

    worker.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(metrics.gauge).toHaveBeenCalledWith('dvt.intent.reconcile.backoff_ms', 100);

    await vi.advanceTimersByTimeAsync(100);
    expect(reconcile).toHaveBeenCalledTimes(2);

    // Success should reset counter. Next infra error must use base backoff again (100), not 200.
    await vi.advanceTimersByTimeAsync(500);
    expect(reconcile).toHaveBeenCalledTimes(3);
    const gauges = metrics.gauge.mock.calls
      .filter((call) => call[0] === 'dvt.intent.reconcile.backoff_ms')
      .map((call) => call[1]);
    expect(gauges).toEqual([100, 100]);

    await worker.stop();
  });

  it('records elapsed duration from injected clock deterministically', async () => {
    const inFlight = deferred<ReturnType<typeof resultType>>();
    const reconcile = vi.fn().mockImplementation(() => inFlight.promise);
    const clock = {
      nowIsoUtc: vi
        .fn()
        .mockReturnValueOnce('2026-03-05T00:00:00.000Z')
        .mockReturnValueOnce('2026-03-05T00:00:00.035Z'),
    };
    const { worker, metrics } = setupTest(
      reconcile,
      { intervalMs: 10_000, jitterRatio: 0 },
      { clock, random: () => 0 }
    );

    worker.start();
    await vi.advanceTimersByTimeAsync(0);
    inFlight.resolve({
      inspected: 1,
      expired: [],
      resolved: [],
      cancelled: [],
      cancelFailed: [],
      deferred: [],
    });
    await vi.advanceTimersByTimeAsync(0);

    const durationCalls = metrics.timing.mock.calls.filter(
      (call) => call[0] === 'dvt.intent.reconcile.duration_ms'
    );
    expect(durationCalls.length).toBeGreaterThan(0);
    const durationMs = durationCalls.at(-1)?.[1];
    expect(typeof durationMs).toBe('number');
    expect(durationMs).toBe(35);
    expect(clock.nowIsoUtc).toHaveBeenCalledTimes(2);

    await worker.stop();
  });

  it('emits resolved_total and cancelFailed_total metrics with the exact reconcile result sizes', async () => {
    const reconcile = vi.fn().mockResolvedValue({
      inspected: 7,
      expired: ['e1'],
      resolved: ['r1', 'r2', 'r3'],
      cancelled: ['c1', 'c2'],
      cancelFailed: ['f1', 'f2', 'f3'],
      deferred: [],
    });
    const { worker, metrics } = setupTest(reconcile, {
      intervalMs: 10_000,
      jitterRatio: 0,
    });

    worker.start();
    await vi.advanceTimersByTimeAsync(0);

    expect(metrics.increment).toHaveBeenCalledWith('dvt.intent.reconcile.resolved_total', 3);
    expect(metrics.increment).toHaveBeenCalledWith('dvt.intent.reconcile.cancelFailed_total', 3);

    await worker.stop();
  });
});
