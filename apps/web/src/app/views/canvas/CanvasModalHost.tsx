/**
 * Owned concern: host Canvas-owned modal overlays outside the shell layout.
 */
import { ConfirmEdgeModal, PlanPreviewModal } from '../../components/Modals';
import type { CanvasModalHostProps } from './canvasModalHost.types';
import { GraphSqlReplacementConfirmationDialog } from './GraphSqlReplacementConfirmationDialog';

export default function CanvasModalHost({
  planPreview,
  edgeConfirmation,
  graphSqlReplacement,
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

      {edgeConfirmation == null ? null : (
        <ConfirmEdgeModal
          open={edgeConfirmation.open}
          onClose={edgeConfirmation.onClose}
          edge={edgeConfirmation.edge}
          onConfirm={edgeConfirmation.onConfirm}
        />
      )}

      {graphSqlReplacement == null ? null : (
        <GraphSqlReplacementConfirmationDialog
          open={graphSqlReplacement.open}
          paths={graphSqlReplacement.paths}
          busy={graphSqlReplacement.busy}
          onCancel={graphSqlReplacement.onCancel}
          onConfirm={graphSqlReplacement.onConfirm}
        />
      )}
    </>
  );
}
