import type { IObservability } from '@dvt/observability';
import type { FastifyBaseLogger } from 'fastify';

import type { ReconcilerHealthState } from './reconcilerHealth.js';
import { emitReconcilerHealthTransitionMonitoring } from './reconcilerHealthMonitoring.js';
import {
  evaluateReconcilerHealthStaleTransition,
  type ReconcilerHealthStaleWindow,
  type ReconcilerHealthTransition,
} from './reconcilerHealthStateMachine.js';

type IntervalHandle = ReturnType<typeof setInterval>;

export type ReconcilerHealthWatchdog = {
  markSweepSignal: () => void;
  stop: () => void;
};

export type ReconcilerHealthWatchdogConfig = {
  staleMs: number;
  pollMs: number;
};

export type ReconcilerHealthWatchdogContext = {
  getIntentReconcilerHealth: () => ReconcilerHealthState;
  setIntentReconcilerHealth: (health: ReconcilerHealthState) => void;
  observability: IObservability;
};

type ReconcilerHealthWatchdogDeps = {
  now: () => number;
  setInterval: (handler: () => void, timeout?: number) => IntervalHandle;
  clearInterval: (handle: IntervalHandle) => void;
};

const DEFAULT_WATCHDOG_DEPS: ReconcilerHealthWatchdogDeps = {
  now: () => Date.now(),
  setInterval: (handler: () => void, timeout?: number): IntervalHandle =>
    setInterval(handler, timeout),
  clearInterval: (handle: IntervalHandle): void => clearInterval(handle),
};

function assertPositiveFiniteTimeout(
  value: number,
  field: keyof ReconcilerHealthWatchdogConfig
): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(
      `Invalid reconciler watchdog config: ${field} must be a positive finite number`
    );
  }
}

function validateWatchdogConfig(config: ReconcilerHealthWatchdogConfig): void {
  assertPositiveFiniteTimeout(config.staleMs, 'staleMs');
  assertPositiveFiniteTimeout(config.pollMs, 'pollMs');
}

export function startReconcilerHealthWatchdog(
  ctx: ReconcilerHealthWatchdogContext,
  logger: FastifyBaseLogger,
  config: ReconcilerHealthWatchdogConfig,
  deps: ReconcilerHealthWatchdogDeps = DEFAULT_WATCHDOG_DEPS
): ReconcilerHealthWatchdog {
  validateWatchdogConfig(config);
  let lastSweepSignalAtMs = deps.now();
  const interval = deps.setInterval(() => {
    const window: ReconcilerHealthStaleWindow = {
      staleMs: config.staleMs,
      lastSweepSignalAtMs,
      nowMs: deps.now(),
    };
    const transition: ReconcilerHealthTransition | null = evaluateReconcilerHealthStaleTransition(
      ctx.getIntentReconcilerHealth(),
      window
    );
    if (transition === null) return;

    ctx.setIntentReconcilerHealth(transition.nextHealth);
    emitReconcilerHealthTransitionMonitoring(transition, ctx.observability, logger, window);
  }, config.pollMs);
  interval.unref?.();

  return {
    markSweepSignal: () => {
      lastSweepSignalAtMs = deps.now();
    },
    stop: () => {
      deps.clearInterval(interval);
    },
  };
}
