/**
 * Owned concern: host Canvas-owned modal overlays outside the shell layout.
 */
import { ConfirmEdgeModal } from '../../components/Modals';
import { PlanPreviewModal } from '../../components/PlanPreviewModal';
import { canvasViewCopy } from './copy';
import type { CanvasModalHostProps } from './canvasModalHost.types';

export default function CanvasModalHost({ planPreview, edgeConfirmation }: CanvasModalHostProps) {
  return (
    <>
      <PlanPreviewModal
        open={planPreview.open}
        onClose={planPreview.onClose}
        plan={planPreview.plan}
        outcome={planPreview.outcome}
        messages={canvasViewCopy}
        startRunDisabled={!planPreview.canStartRun}
        startRunMessage={planPreview.planStatusSummary}
        onStartRun={planPreview.onStartRun}
      />

      {edgeConfirmation == null ? null : (
        <ConfirmEdgeModal
          open={edgeConfirmation.open}
          onClose={edgeConfirmation.onClose}
          edge={edgeConfirmation.edge}
          onConfirm={edgeConfirmation.onConfirm}
        />
      )}
    </>
  );
}
