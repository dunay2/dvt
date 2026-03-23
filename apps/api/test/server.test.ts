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
});
