import type { ExecutionPlan } from './ExecutionPlan.v1.js';

/**
 * S08 admission relation between a persisted plan and a run.
 *
 * Baseline ADRs:
 * - ADR-0041 explicit boundary contracts
 * - ADR-0043 admission modeled as a relation, not as a plan state
 */
export interface PlanAdmissionLink {
  planId: ExecutionPlan['metadata']['planId'];
  runId: string;
  adapterId: string;
  admittedAtIso: string;
}
