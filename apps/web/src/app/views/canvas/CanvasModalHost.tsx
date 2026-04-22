/**
 * Owned concern: host Canvas-owned modal overlays outside the shell layout.
 */
import { ConfirmEdgeModal, PlanPreviewModal } from '../../components/Modals';
import type { CanvasModalHostProps } from './canvasModalHost.types';

export default function CanvasModalHost({
  planPreview,
  edgeConfirmation,
}: CanvasModalHostProps) {
  return (
    <>
      <PlanPreviewModal
        open={planPreview.open}
        onClose={planPreview.onClose}
        plan={planPreview.plan}
        startRunDisabled={!planPreview.canStartRun}
        startRunMessage={planPreview.planStatusSummary}
        onStartRun={planPreview.onStartRun}
      />

      <ConfirmEdgeModal
        open={edgeConfirmation.open}
        onClose={edgeConfirmation.onClose}
        edge={edgeConfirmation.edge}
        onConfirm={edgeConfirmation.onConfirm}
      />
    </>
  );
}
