/**
 * @ownedConcern Expose the API-side intent reconciler runtime factory and handle contract.
 * @baseline ADR-0039: Hexagonal Port Hardening and SOLID Remediation
 * @decision Keep this module as the public runtime facade; delegate concrete assembly to composition.
 * @consequence Callers keep a stable API while Postgres/provider/worker wiring stays root-owned.
 * @version 1.1.0
 */
import type { IObservability } from '@dvt/observability';
import type { FastifyBaseLogger } from 'fastify';

import type { Env } from '../plugins/env.js';

import { createIntentReconcilerRuntimeComposition } from './intentReconcilerRuntimeComposition.js';

export interface IntentReconcilerRuntimeHandle {
  start(): void;
  stop(): Promise<void>;
}

export interface ReconcilerRuntimeHealthHooks {
  onSweepSuccess?: () => void;
  onSweepFailure?: () => void;
}

export async function createIntentReconcilerRuntime(
  env: Env,
  logger: FastifyBaseLogger,
  observability: IObservability,
  healthHooks: ReconcilerRuntimeHealthHooks = {}
): Promise<IntentReconcilerRuntimeHandle | null> {
  return createIntentReconcilerRuntimeComposition(env, logger, observability, healthHooks).create();
}
