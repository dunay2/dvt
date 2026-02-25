/**
 * @file packages/@dvt/engine/src/adapters/IPlanFetcher.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @decision Decision — The engine resolves and delivers normalized plans to adapters via an explicit port
 * @consequence Avoid coupling adapters to plan sources and preserve semantic sovereignty in the domain
 * @version 1.0.0
 * @date 2026-02-21
 */
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
//# sourceMappingURL=IPlanFetcher.d.ts.map
