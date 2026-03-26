import type { FastifyBaseLogger } from 'fastify';

import type { AppContext } from '../app.js';

import {
  createIntentReconcilerRuntime,
  type IntentReconcilerRuntimeHandle,
  type ReconcilerRuntimeHealthHooks,
} from './intentReconcilerRuntime.js';
import {
  RECONCILER_HEALTH_REASON_CODE,
  RECONCILER_HEALTH_STATUS,
  type ReconcilerHealthState,
} from './reconcilerHealth.js';
import type { ReconcilerHealthWatchdog } from './reconcilerHealthWatchdog.js';

export type CreateIntentReconcilerRuntime = (
  env: AppContext['env'],
  logger: FastifyBaseLogger,
  observability: AppContext['observability'],
  healthHooks?: ReconcilerRuntimeHealthHooks
) => Promise<IntentReconcilerRuntimeHandle | null>;

export const DEFAULT_CREATE_INTENT_RECONCILER_RUNTIME: CreateIntentReconcilerRuntime =
  createIntentReconcilerRuntime;

export function buildReconcilerHealthHooks(
  setIntentReconcilerHealth: (health: ReconcilerHealthState) => void
): ReconcilerRuntimeHealthHooks {
  return {
    onSweepFailure: () => {
      setIntentReconcilerHealth({
        status: RECONCILER_HEALTH_STATUS.degraded,
        reasonCode: RECONCILER_HEALTH_REASON_CODE.runtimeUnavailable,
      });
    },
    onSweepSuccess: () => {
      setIntentReconcilerHealth({ status: RECONCILER_HEALTH_STATUS.healthy });
    },
  };
}

export function withWatchdogSweepSignalHooks(
  createRuntime: CreateIntentReconcilerRuntime,
  getWatchdog: () => ReconcilerHealthWatchdog | null
): CreateIntentReconcilerRuntime {
  return (env, logger, observability, healthHooks = {}) =>
    createRuntime(env, logger, observability, {
      onSweepSuccess: () => {
        getWatchdog()?.markSweepSignal();
        healthHooks.onSweepSuccess?.();
      },
      onSweepFailure: () => {
        healthHooks.onSweepFailure?.();
      },
    });
}
