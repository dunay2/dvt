import type { IObservability } from '@dvt/observability';
import type { FastifyBaseLogger } from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import type { Env } from '../src/plugins/env.js';
import type {
  IntentReconcilerRuntimeHandle,
  ReconcilerRuntimeHealthHooks,
} from '../src/runtime/intentReconcilerRuntime.js';
import type { ReconcilerHealthState } from '../src/runtime/reconcilerHealth.js';
import {
  bootstrapIntentReconciler,
  buildReconcilerHealthHooks,
  computeReconcilerHealthStaleMs,
  evaluateAndMarkReconcilerHealthStale,
  startReconcilerHealthWatchdog,
  shouldMarkReconcilerRuntimeUnavailable,
} from '../src/server.js';

function createHarness(): {
  ctx: {
    env: Env;
    observability: IObservability;
    setIntentReconcilerHealth: (next: ReconcilerHealthState) => void;
  };
  logger: FastifyBaseLogger;
  getHealth: () => ReconcilerHealthState;
} {
  let health: ReconcilerHealthState = { status: 'starting' };
  const setIntentReconcilerHealth = (next: ReconcilerHealthState): void => {
    health = next;
  };
  const ctx = {
    env: {} as Env,
    observability: {} as IObservability,
    setIntentReconcilerHealth,
  };
  const logger = {
    info: vi.fn(),
    error: vi.fn(),
  } as unknown as FastifyBaseLogger;

  return {
    ctx,
    logger,
    getHealth: () => health,
  };
}

describe('reconciler bootstrap health wiring', () => {
  it('integrates timer watchdog with sweep signals for stale degradation and recovery', () => {
    vi.useFakeTimers();
    let nowMs = 1_000;
    vi.setSystemTime(new Date(nowMs));
    const nowSpy = vi.spyOn(Date, 'now').mockImplementation(() => nowMs);

    try {
      let health: ReconcilerHealthState = { status: 'starting' };
      const add = vi.fn();
      const counter = vi.fn(() => ({ add }));
      const logger = {
        error: vi.fn(),
      } as unknown as FastifyBaseLogger;
      const ctx = {
        getIntentReconcilerHealth: () => health,
        setIntentReconcilerHealth: (next: ReconcilerHealthState) => {
          health = next;
        },
        observability: {
          metrics: {
            counter,
          },
        } as unknown as IObservability,
      };
      const hooks = buildReconcilerHealthHooks(ctx.setIntentReconcilerHealth);
      const watchdog = startReconcilerHealthWatchdog(ctx, logger, 5_000, 1_000);

      nowMs = 7_500;
      vi.advanceTimersByTime(6_000);
      expect(health).toEqual({
        status: 'degraded',
        reasonCode: 'runtime_unavailable',
      });
      expect(add).toHaveBeenCalledWith(1);

      watchdog.markSweepSignal();
      hooks.onSweepSuccess?.();
      expect(health).toEqual({ status: 'healthy' });

      nowMs = 11_000;
      vi.advanceTimersByTime(3_000);
      expect(health).toEqual({ status: 'healthy' });

      watchdog.stop();
    } finally {
      nowSpy.mockRestore();
      vi.useRealTimers();
    }
  });

  it('maps runtime hooks to health transitions', () => {
    const harness = createHarness();
    const hooks = buildReconcilerHealthHooks(harness.ctx.setIntentReconcilerHealth);

    hooks.onSweepFailure?.();
    expect(harness.getHealth()).toEqual({
      status: 'degraded',
      reasonCode: 'runtime_unavailable',
    });

    hooks.onSweepSuccess?.();
    expect(harness.getHealth()).toEqual({ status: 'healthy' });
  });

  it('clears watchdog interval on stop', () => {
    const intervalHandle = setInterval(() => undefined, 60_000);
    const unrefSpy = vi.spyOn(intervalHandle, 'unref');
    const setIntervalSpy = vi.fn<(_: () => void) => ReturnType<typeof setInterval>>(
      (_handler: () => void) => intervalHandle
    );
    const clearIntervalSpy = vi.fn((handle: ReturnType<typeof setInterval>) => {
      clearInterval(handle);
    });
    const logger = {
      error: vi.fn(),
    } as unknown as FastifyBaseLogger;
    const ctx = {
      getIntentReconcilerHealth: () => ({ status: 'starting' as const }),
      setIntentReconcilerHealth: vi.fn(),
      observability: {
        metrics: {
          counter: vi.fn(() => ({ add: vi.fn() })),
        },
      } as unknown as IObservability,
    };

    const watchdog = startReconcilerHealthWatchdog(ctx, logger, 5_000, 1_000, {
      now: () => 1_000,
      setInterval: setIntervalSpy,
      clearInterval: clearIntervalSpy,
    });

    watchdog.stop();

    expect(setIntervalSpy).toHaveBeenCalledOnce();
    expect(unrefSpy).toHaveBeenCalledOnce();
    expect(clearIntervalSpy).toHaveBeenCalledWith(intervalHandle);
  });

  it('does not run stale evaluation after watchdog stop', () => {
    vi.useFakeTimers();
    let nowMs = 1_000;
    vi.setSystemTime(new Date(nowMs));
    const nowSpy = vi.spyOn(Date, 'now').mockImplementation(() => nowMs);

    try {
      let health: ReconcilerHealthState = { status: 'starting' };
      const add = vi.fn();
      const counter = vi.fn(() => ({ add }));
      const logger = {
        error: vi.fn(),
      } as unknown as FastifyBaseLogger;
      const ctx = {
        getIntentReconcilerHealth: () => health,
        setIntentReconcilerHealth: (next: ReconcilerHealthState) => {
          health = next;
        },
        observability: {
          metrics: {
            counter,
          },
        } as unknown as IObservability,
      };

      const watchdog = startReconcilerHealthWatchdog(ctx, logger, 5_000, 1_000);
      watchdog.stop();

      nowMs = 9_000;
      vi.advanceTimersByTime(8_000);

      expect(health).toEqual({ status: 'starting' });
      expect(counter).not.toHaveBeenCalled();
      expect(add).not.toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
    } finally {
      nowSpy.mockRestore();
      vi.useRealTimers();
    }
  });

  it('sets disabled health when runtime is not created', async () => {
    const harness = createHarness();
    let capturedHooks: ReconcilerRuntimeHealthHooks | undefined;

    const createRuntime = vi.fn(async (_env, _logger, _observability, hooks) => {
      capturedHooks = hooks;
      return null;
    });

    const result = await bootstrapIntentReconciler(harness.ctx, harness.logger, createRuntime);

    expect(result).toBeNull();
    expect(harness.getHealth()).toEqual({ status: 'disabled' });
    expect(capturedHooks).toBeDefined();
  });

  it('starts runtime and applies starting then runtime transitions', async () => {
    const harness = createHarness();
    const runtime: IntentReconcilerRuntimeHandle = {
      start: vi.fn(),
      stop: vi.fn(async () => {}),
    };
    let capturedHooks: ReconcilerRuntimeHealthHooks | undefined;

    const createRuntime = vi.fn(async (_env, _logger, _observability, hooks) => {
      capturedHooks = hooks;
      return runtime;
    });

    const result = await bootstrapIntentReconciler(harness.ctx, harness.logger, createRuntime);

    expect(result).toBe(runtime);
    expect(runtime.start).toHaveBeenCalledOnce();
    expect(harness.getHealth()).toEqual({ status: 'starting' });

    capturedHooks?.onSweepSuccess?.();
    expect(harness.getHealth()).toEqual({ status: 'healthy' });

    capturedHooks?.onSweepFailure?.();
    expect(harness.getHealth()).toEqual({
      status: 'degraded',
      reasonCode: 'runtime_unavailable',
    });

    capturedHooks?.onSweepSuccess?.();
    expect(harness.getHealth()).toEqual({ status: 'healthy' });
  });

  it('sets bootstrap_failed when runtime creation throws', async () => {
    const harness = createHarness();
    const createRuntime = vi.fn(async () => {
      throw new Error('bootstrap boom');
    });

    const result = await bootstrapIntentReconciler(harness.ctx, harness.logger, createRuntime);

    expect(result).toBeNull();
    expect(harness.getHealth()).toEqual({
      status: 'degraded',
      reasonCode: 'bootstrap_failed',
    });
  });

  it('sets bootstrap_failed when runtime creation throws non-Error values', async () => {
    const harness = createHarness();
    const createRuntime = vi.fn(async () => {
      throw 'boom'; // NOSONAR - intentionally throws a non-Error value to test that code path
    });

    const result = await bootstrapIntentReconciler(harness.ctx, harness.logger, createRuntime);

    expect(result).toBeNull();
    expect(harness.getHealth()).toEqual({
      status: 'degraded',
      reasonCode: 'bootstrap_failed',
    });
  });

  it('computes stale threshold from runtime timings', () => {
    const staleMs = computeReconcilerHealthStaleMs({
      DVT_INTENT_RECONCILER_INTERVAL_MS: 15_000,
      DVT_INTENT_RECONCILER_TICK_TIMEOUT_MS: 20_000,
      DVT_INTENT_RECONCILER_BACKOFF_MAX_MS: 60_000,
    } as Env);

    expect(staleMs).toBe(80_000);
  });

  it('marks runtime unavailable only when non-degraded health exceeds stale threshold', () => {
    expect(shouldMarkReconcilerRuntimeUnavailable({ status: 'healthy' }, 1_000, 5_000, 5_000)).toBe(
      false
    );

    expect(
      shouldMarkReconcilerRuntimeUnavailable({ status: 'starting' }, 1_000, 7_000, 5_000)
    ).toBe(true);

    expect(
      shouldMarkReconcilerRuntimeUnavailable(
        { status: 'degraded', reasonCode: 'runtime_unavailable' },
        1_000,
        10_000,
        5_000
      )
    ).toBe(false);
  });

  it('emits stale metric and log when stale threshold is exceeded', () => {
    let health: ReconcilerHealthState = { status: 'healthy' };
    const add = vi.fn();
    const counter = vi.fn(() => ({ add }));
    const logger = {
      error: vi.fn(),
    } as unknown as FastifyBaseLogger;

    const marked = evaluateAndMarkReconcilerHealthStale(
      {
        getIntentReconcilerHealth: () => health,
        setIntentReconcilerHealth: (next) => {
          health = next;
        },
        observability: {
          metrics: {
            counter,
          },
        } as unknown as IObservability,
      },
      logger,
      5_000,
      1_000,
      7_000
    );

    expect(marked).toBe(true);
    expect(health).toEqual({
      status: 'degraded',
      reasonCode: 'runtime_unavailable',
    });
    expect(counter).toHaveBeenCalledWith('dvt.intent.reconcile.health_stale_total');
    expect(add).toHaveBeenCalledWith(1);
    expect(logger.error).toHaveBeenCalledOnce();
  });

  it('does not emit stale metric when threshold is not exceeded', () => {
    let health: ReconcilerHealthState = { status: 'starting' };
    const add = vi.fn();
    const counter = vi.fn(() => ({ add }));
    const logger = {
      error: vi.fn(),
    } as unknown as FastifyBaseLogger;

    const marked = evaluateAndMarkReconcilerHealthStale(
      {
        getIntentReconcilerHealth: () => health,
        setIntentReconcilerHealth: (next) => {
          health = next;
        },
        observability: {
          metrics: {
            counter,
          },
        } as unknown as IObservability,
      },
      logger,
      10_000,
      1_000,
      5_000
    );

    expect(marked).toBe(false);
    expect(health).toEqual({ status: 'starting' });
    expect(counter).not.toHaveBeenCalled();
    expect(add).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('recovers health after a stale watchdog degradation once a later sweep succeeds', () => {
    let health: ReconcilerHealthState = { status: 'starting' };
    const add = vi.fn();
    const counter = vi.fn(() => ({ add }));
    const logger = {
      error: vi.fn(),
    } as unknown as FastifyBaseLogger;

    const ctx = {
      getIntentReconcilerHealth: () => health,
      setIntentReconcilerHealth: (next: ReconcilerHealthState) => {
        health = next;
      },
      observability: {
        metrics: {
          counter,
        },
      } as unknown as IObservability,
    };
    const hooks = buildReconcilerHealthHooks(ctx.setIntentReconcilerHealth);

    expect(evaluateAndMarkReconcilerHealthStale(ctx, logger, 5_000, 1_000, 7_500)).toBe(true);
    expect(health).toEqual({
      status: 'degraded',
      reasonCode: 'runtime_unavailable',
    });
    expect(counter).toHaveBeenCalledTimes(1);
    expect(add).toHaveBeenCalledWith(1);

    hooks.onSweepSuccess?.();
    expect(health).toEqual({ status: 'healthy' });

    expect(evaluateAndMarkReconcilerHealthStale(ctx, logger, 5_000, 7_400, 7_900)).toBe(false);
    expect(health).toEqual({ status: 'healthy' });
    expect(counter).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledTimes(1);
  });
});
