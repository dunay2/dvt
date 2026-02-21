import type { PlanRef } from '@dvt/contracts';

import type { ExecutionPlan } from '../contracts/executionPlan.js';

/**
 * Fetches and returns the resolved ExecutionPlan for a given PlanRef.
 *
 * The engine calls this before invoking IProviderAdapter.startRun so that
 * adapters receive a fully-resolved plan instead of a URI they would have
 * to re-fetch themselves (plan-bytes ownership is the engine's responsibility).
 */
export interface IPlanFetcher {
  fetch(planRef: PlanRef): Promise<ExecutionPlan>;
}
