import type { IObservability } from '@dvt/observability';
import type { FastifyBaseLogger } from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import type { Env } from '../src/plugins/env.js';
import type {
  IntentReconcilerRuntimeHandle,
  ReconcilerRuntimeHealthHooks,
} from '../src/runtime/intentReconcilerRuntime.js';
import type { ReconcilerHealthState } from '../src/runtime/reconcilerHealth.js';
import { emitReconcilerHealthTransitionMonitoring } from '../src/runtime/reconcilerHealthMonitoring.js';
import { computeReconcilerHealthStaleMs } from '../src/runtime/reconcilerHealthPolicy.js';
import {
  evaluateReconcilerHealthStaleTransition,
  shouldMarkReconcilerRuntimeUnavailable,
} from '../src/runtime/reconcilerHealthStateMachine.js';
import { startReconcilerHealthWatchdog } from '../src/runtime/reconcilerHealthWatchdog.js';
import {
  bootstrapIntentReconciler,
  buildReconcilerHealthHooks,
  withWatchdogSweepSignalHooks,
} from '../src/runtime/reconcilerRuntimeBootstrap.js';
import { RECONCILER_RUNTIME_METRICS } from '../src/runtime/reconcilerRuntimeTelemetry.js';

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
      const watchdog = startReconcilerHealthWatchdog(ctx, logger, {
        staleMs: 5_000,
        pollMs: 1_000,
      });

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

    const watchdog = startReconcilerHealthWatchdog(
      ctx,
      logger,
      { staleMs: 5_000, pollMs: 1_000 },
      {
        now: () => 1_000,
        setInterval: setIntervalSpy,
        clearInterval: clearIntervalSpy,
      }
    );

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

      const watchdog = startReconcilerHealthWatchdog(ctx, logger, {
        staleMs: 5_000,
        pollMs: 1_000,
      });
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

  it('fails fast when watchdog staleMs is invalid', () => {
    const logger = { error: vi.fn() } as unknown as FastifyBaseLogger;
    const ctx = {
      getIntentReconcilerHealth: () => ({ status: 'starting' as const }),
      setIntentReconcilerHealth: vi.fn(),
      observability: {
        metrics: {
          counter: vi.fn(() => ({ add: vi.fn() })),
        },
      } as unknown as IObservability,
    };

    expect(() => startReconcilerHealthWatchdog(ctx, logger, { staleMs: 0, pollMs: 1_000 })).toThrow(
      /staleMs must be a positive finite number/
    );
  });

  it('fails fast when watchdog pollMs is invalid', () => {
    const logger = { error: vi.fn() } as unknown as FastifyBaseLogger;
    const ctx = {
      getIntentReconcilerHealth: () => ({ status: 'starting' as const }),
      setIntentReconcilerHealth: vi.fn(),
      observability: {
        metrics: {
          counter: vi.fn(() => ({ add: vi.fn() })),
        },
      } as unknown as IObservability,
    };

    expect(() =>
      startReconcilerHealthWatchdog(ctx, logger, { staleMs: 5_000, pollMs: Number.NaN })
    ).toThrow(/pollMs must be a positive finite number/);
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

  it('marks watchdog sweep signal only on successful sweeps', async () => {
    const runtime: IntentReconcilerRuntimeHandle = {
      start: vi.fn(),
      stop: vi.fn(async () => {}),
    };
    const markSweepSignal = vi.fn();
    const watchdog = {
      markSweepSignal,
      stop: vi.fn(),
    };
    let capturedHooks: ReconcilerRuntimeHealthHooks | undefined;
    const baseCreateRuntime = vi.fn(async (_env, _logger, _observability, hooks) => {
      capturedHooks = hooks;
      return runtime;
    });
    const createRuntime = withWatchdogSweepSignalHooks(baseCreateRuntime, () => watchdog);

    await createRuntime({} as Env, {} as FastifyBaseLogger, {} as IObservability, {});

    capturedHooks?.onSweepFailure?.();
    expect(markSweepSignal).not.toHaveBeenCalled();

    capturedHooks?.onSweepSuccess?.();
    expect(markSweepSignal).toHaveBeenCalledTimes(1);
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
    expect(
      shouldMarkReconcilerRuntimeUnavailable(
        { status: 'healthy' },
        {
          staleMs: 5_000,
          lastSweepSignalAtMs: 1_000,
          nowMs: 5_000,
        }
      )
    ).toBe(false);

    expect(
      shouldMarkReconcilerRuntimeUnavailable(
        { status: 'starting' },
        {
          staleMs: 5_000,
          lastSweepSignalAtMs: 1_000,
          nowMs: 7_000,
        }
      )
    ).toBe(true);

    expect(
      shouldMarkReconcilerRuntimeUnavailable(
        { status: 'degraded', reasonCode: 'runtime_unavailable' },
        {
          staleMs: 5_000,
          lastSweepSignalAtMs: 1_000,
          nowMs: 10_000,
        }
      )
    ).toBe(false);
  });

  it('does not mark runtime unavailable when elapsed time equals stale threshold', () => {
    expect(
      shouldMarkReconcilerRuntimeUnavailable(
        { status: 'starting' },
        {
          staleMs: 5_000,
          lastSweepSignalAtMs: 1_000,
          nowMs: 6_000,
        }
      )
    ).toBe(false);
  });

  it('returns stale transition when threshold is exceeded', () => {
    const current: ReconcilerHealthState = { status: 'healthy' };

    const transition = evaluateReconcilerHealthStaleTransition(current, {
      staleMs: 5_000,
      lastSweepSignalAtMs: 1_000,
      nowMs: 7_000,
    });

    expect(transition).toEqual({
      nextHealth: {
        status: 'degraded',
        reasonCode: 'runtime_unavailable',
      },
      reason: 'runtime_unavailable_stale',
    });
  });

  it('emits stale metric and log when transition monitoring is emitted', () => {
    const add = vi.fn();
    const counter = vi.fn(() => ({ add }));
    const logger = {
      error: vi.fn(),
    } as unknown as FastifyBaseLogger;

    emitReconcilerHealthTransitionMonitoring(
      {
        nextHealth: { status: 'degraded', reasonCode: 'runtime_unavailable' },
        reason: 'runtime_unavailable_stale',
      },
      {
        metrics: {
          counter,
        },
      } as unknown as IObservability,
      logger,
      {
        staleMs: 5_000,
        lastSweepSignalAtMs: 1_000,
        nowMs: 7_000,
      }
    );

    expect(counter).toHaveBeenCalledWith(RECONCILER_RUNTIME_METRICS.healthStaleTotal);
    expect(add).toHaveBeenCalledWith(1);
    expect(logger.error).toHaveBeenCalledOnce();
  });

  it('returns no transition when threshold is not exceeded', () => {
    const current: ReconcilerHealthState = { status: 'starting' };

    const transition = evaluateReconcilerHealthStaleTransition(current, {
      staleMs: 10_000,
      lastSweepSignalAtMs: 1_000,
      nowMs: 5_000,
    });

    expect(transition).toBeNull();
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

    const staleTransition = evaluateReconcilerHealthStaleTransition(health, {
      staleMs: 5_000,
      lastSweepSignalAtMs: 1_000,
      nowMs: 7_500,
    });
    expect(staleTransition).not.toBeNull();
    if (staleTransition !== null) {
      health = staleTransition.nextHealth;
      emitReconcilerHealthTransitionMonitoring(staleTransition, ctx.observability, logger, {
        staleMs: 5_000,
        lastSweepSignalAtMs: 1_000,
        nowMs: 7_500,
      });
    }
    expect(health).toEqual({
      status: 'degraded',
      reasonCode: 'runtime_unavailable',
    });
    expect(counter).toHaveBeenCalledTimes(1);
    expect(add).toHaveBeenCalledWith(1);

    hooks.onSweepSuccess?.();
    expect(health).toEqual({ status: 'healthy' });

    const freshTransition = evaluateReconcilerHealthStaleTransition(health, {
      staleMs: 5_000,
      lastSweepSignalAtMs: 7_400,
      nowMs: 7_900,
    });
    expect(freshTransition).toBeNull();
    expect(health).toEqual({ status: 'healthy' });
    expect(counter).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  it('wires runtime sweep hooks through watchdog signaling used by main bootstrap flow', async () => {
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

      const healthCtx = {
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

      const watchdog = startReconcilerHealthWatchdog(healthCtx, logger, {
        staleMs: 5_000,
        pollMs: 1_000,
      });
      const runtime: IntentReconcilerRuntimeHandle = {
        start: vi.fn(),
        stop: vi.fn(async () => {}),
      };

      let capturedHooks: ReconcilerRuntimeHealthHooks | undefined;
      const baseCreateRuntime = vi.fn(async (_env, _logger, _observability, hooks) => {
        capturedHooks = hooks;
        return runtime;
      });
      const createRuntime = withWatchdogSweepSignalHooks(baseCreateRuntime, () => watchdog);

      const bootstrapCtx = {
        env: {} as Env,
        observability: healthCtx.observability,
        setIntentReconcilerHealth: healthCtx.setIntentReconcilerHealth,
      };

      const reconcilerRuntime = await bootstrapIntentReconciler(
        bootstrapCtx,
        logger,
        createRuntime
      );

      expect(reconcilerRuntime).toBe(runtime);
      expect(health).toEqual({ status: 'starting' });

      nowMs = 7_500;
      vi.advanceTimersByTime(6_000);
      expect(health).toEqual({
        status: 'degraded',
        reasonCode: 'runtime_unavailable',
      });
      expect(add).toHaveBeenCalledTimes(1);

      capturedHooks?.onSweepSuccess?.();
      expect(health).toEqual({ status: 'healthy' });

      nowMs = 11_000;
      vi.advanceTimersByTime(3_000);
      expect(health).toEqual({ status: 'healthy' });
      expect(add).toHaveBeenCalledTimes(1);

      watchdog.stop();
    } finally {
      nowSpy.mockRestore();
      vi.useRealTimers();
    }
  });
});
