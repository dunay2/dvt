import type { ExecutionPlan } from '../types/dbt';
import type { PlanRef, RunContext } from '../types/engine';

// ---------------------------------------------------------------------------
// Presentation-facing DTOs for the plans domain
// ---------------------------------------------------------------------------

export type PlanPreviewInput = {
  selectedNodeIds: string[];
  context: RunContext;
  planName?: string;
};

// ---------------------------------------------------------------------------
// Plans port — presentation-layer contract for plan operations
// ---------------------------------------------------------------------------

/**
 * Port interface for plan operations consumed by the presentation layer.
 *
 * Implementations (mock, API) satisfy this contract through adapters wired
 * in the composition root. Views and hooks depend only on this interface.
 */
export interface IPlansPort {
  previewPlan: (input: PlanPreviewInput) => Promise<ExecutionPlan>;
  importPlan: (planRef: PlanRef, context: RunContext) => Promise<ExecutionPlan>;
}
