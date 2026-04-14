import type { GitArtifactRef, PlanPreviewProvenance, PlanPreviewRequest } from '@dvt/contracts';

import type { PlanRef, RunContext } from '../types/engine';
import type { PlanViewModel } from '../types/plans';

export type { GitArtifactRef, PlanPreviewProvenance };

// ---------------------------------------------------------------------------
// Presentation-facing DTOs for the plans domain
// ---------------------------------------------------------------------------

export type PlanPreviewInput = PlanPreviewRequest;

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
  previewPlan: (input: PlanPreviewInput) => Promise<PlanViewModel>;
  importPlan: (planRef: PlanRef, context: RunContext) => Promise<PlanViewModel>;
}
