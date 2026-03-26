import type { Env } from '../plugins/env.js';

export type ReconcilerHealthPolicy = {
  staleMultiplier: number;
  minWatchdogPollMs: number;
  watchdogPollDivisor: number;
};

export const DEFAULT_RECONCILER_HEALTH_POLICY: ReconcilerHealthPolicy = Object.freeze({
  staleMultiplier: 3,
  minWatchdogPollMs: 1_000,
  watchdogPollDivisor: 2,
});

export function computeReconcilerHealthStaleMs(
  env: Env,
  policy: ReconcilerHealthPolicy = DEFAULT_RECONCILER_HEALTH_POLICY
): number {
  return Math.max(
    env.DVT_INTENT_RECONCILER_INTERVAL_MS * policy.staleMultiplier,
    env.DVT_INTENT_RECONCILER_TICK_TIMEOUT_MS + env.DVT_INTENT_RECONCILER_BACKOFF_MAX_MS
  );
}

export function computeReconcilerHealthPollMs(
  staleMs: number,
  policy: ReconcilerHealthPolicy = DEFAULT_RECONCILER_HEALTH_POLICY
): number {
  return Math.max(policy.minWatchdogPollMs, Math.floor(staleMs / policy.watchdogPollDivisor));
}
