import type { FastifyBaseLogger } from 'fastify';

import {
  evaluateAndMarkReconcilerHealthStale,
  type ReconcilerHealthReadContext,
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

export function startReconcilerHealthWatchdog(
  ctx: ReconcilerHealthReadContext,
  logger: FastifyBaseLogger,
  config: ReconcilerHealthWatchdogConfig,
  deps: ReconcilerHealthWatchdogDeps = DEFAULT_WATCHDOG_DEPS
): ReconcilerHealthWatchdog {
  let lastSweepSignalAtMs = deps.now();
  const interval = deps.setInterval(() => {
    evaluateAndMarkReconcilerHealthStale(ctx, logger, {
      staleMs: config.staleMs,
      lastSweepSignalAtMs,
      nowMs: deps.now(),
    });
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
