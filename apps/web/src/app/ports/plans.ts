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
 * The product composition root wires the API adapter. Tests may satisfy this
 * contract with explicit doubles injected at the AppServices boundary.
 */
export interface IPlansPort {
  previewPlan: (input: PlanPreviewInput) => Promise<PlanViewModel>;
  importPlan: (planRef: PlanRef, context: RunContext) => Promise<PlanViewModel>;
}
