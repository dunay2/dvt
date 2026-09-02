/**
 * Owned concern: define the semantic component contract for CanvasModalHost.
 */
import type { PlanViewModel } from '../../types/plans';
import type { PlanPreviewOutcome } from '../../ports/plans';

export type CanvasPlanPreviewModalContract = Readonly<{
  open: boolean;
  plan: PlanViewModel | null;
  outcome: PlanPreviewOutcome | null;
  canStartRun: boolean;
  planStatusSummary: string;
  onClose: () => void;
  onStartRun: () => void;
}>;

export type CanvasModalHostProps = Readonly<{
  planPreview: CanvasPlanPreviewModalContract;
}>;
