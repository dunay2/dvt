/**
 * Owned concern: host Canvas-owned modal overlays outside the shell layout.
 */
import { PlanPreviewModal } from '../../components/PlanPreviewModal';
import { canvasViewCopy } from './copy';
import type { CanvasModalHostProps } from './canvasModalHost.types';

export default function CanvasModalHost({ planPreview }: CanvasModalHostProps) {
  return (
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
  );
}
