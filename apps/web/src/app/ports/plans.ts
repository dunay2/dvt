import type { GenericGraphSourceV1 } from '@dvt/contracts';

import type { ExecutionPlan } from '../types/dbt';
import type { PlanRef, RunContext } from '../types/engine';

// ---------------------------------------------------------------------------
// Presentation-facing DTOs for the plans domain
// ---------------------------------------------------------------------------

export type PlanPreviewInput = {
  previewProfile: 'planner-generic-v1' | 'transformation-sql-first-v1';
  graphSource: GenericGraphSourceV1;
  selectedNodeIds: string[];
  context: RunContext;
  planName?: string;
  persist: true;
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
