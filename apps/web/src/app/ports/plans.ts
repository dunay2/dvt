import type {
  ExecutabilityValidationResult,
  GitArtifactRef,
  PlanPreviewProvenance,
  PlanPreviewRequest,
  PlanPreviewSelectionRejection,
} from '@dvt/contracts';

import type { PlanRef, RunContext } from '../types/engine';
import type { PlanViewModel } from '../types/plans';

export type { GitArtifactRef, PlanPreviewProvenance };

// ---------------------------------------------------------------------------
// Presentation-facing DTOs for the plans domain
// ---------------------------------------------------------------------------

export type PlanPreviewInput = PlanPreviewRequest;

export type PreviewedPlanViewModel = PlanViewModel & { readonly planRef: PlanRef };

export type PlanPreviewOutcome =
  | Readonly<{ kind: 'accepted'; plan: PreviewedPlanViewModel }>
  | Readonly<{ kind: 'selection-rejected'; rejection: PlanPreviewSelectionRejection }>
  | Readonly<{
      kind: 'plan-invalid';
      plan: PreviewedPlanViewModel;
      validation: Extract<ExecutabilityValidationResult, { readonly status: 'ERROR' }>;
    }>;

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
  previewPlan: (input: PlanPreviewInput) => Promise<PlanPreviewOutcome>;
  importPlan: (planRef: PlanRef, context: RunContext) => Promise<PlanViewModel>;
}
