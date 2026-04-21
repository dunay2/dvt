/**
 * Owned concern: define the semantic component contract for CanvasModalHost.
 */
import type { PlanViewModel } from '../../types/plans';
import type { ConfirmEdgeModalState } from './canvasGraphHandlerContracts';

export type CanvasPlanPreviewModalContract = Readonly<{
  open: boolean;
  plan: PlanViewModel | null;
  canStartRun: boolean;
  planStatusSummary: string;
  onClose: () => void;
  onStartRun: () => void;
}>;

export type CanvasEdgeConfirmationModalContract = Readonly<{
  open: boolean;
  edge: ConfirmEdgeModalState['edge'];
  onClose: () => void;
  onConfirm: () => void;
}>;

export type CanvasModalHostProps = Readonly<{
  planPreview: CanvasPlanPreviewModalContract;
  edgeConfirmation: CanvasEdgeConfirmationModalContract;
}>;
