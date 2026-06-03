import type { ExecutionPlan } from './ExecutionPlan.v1.js';
import type { PlanStoreScope } from './PlanRecord.v1.js';

/**
 * Owned concern: publish tenant-owned plan admission link shapes.
 *
 * S08 admission relation between a persisted plan and a run.
 *
 * Baseline ADRs:
 * - ADR-0041 explicit boundary contracts
 * - ADR-0043 admission modeled as a relation, not as a plan state
 */
export interface PlanAdmissionLink extends PlanStoreScope {
  planId: ExecutionPlan['metadata']['planId'];
  runId: string;
  adapterId: string;
  admittedAtIso: string;
}
