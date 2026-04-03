import { ReactFlowProvider } from '@xyflow/react';

import { ConfirmEdgeModal, PlanPreviewModal } from '../components/Modals';
import type { ExecutionPlan } from '../types/dbt';
import CanvasWorkbench from './canvas/CanvasWorkbench';
import { useCanvasController } from './canvas/useCanvasController';

function CanvasContent() {
  const controller = useCanvasController();

  return (
    <>
      <CanvasWorkbench controller={controller} />

      <PlanPreviewModal
        open={controller.planModalOpen}
        onClose={() => {
          controller.setPlanModalOpen(false);
        }}
        plan={controller.currentPlan as ExecutionPlan | null}
        onStartRun={() => {
          void controller.handleStartRun();
        }}
      />

      <ConfirmEdgeModal
        open={controller.confirmEdgeModal.open}
        onClose={() => {
          controller.setConfirmEdgeModal({ open: false, edge: null });
        }}
        edge={controller.confirmEdgeModal.edge}
        onConfirm={controller.confirmEdgeCreation}
      />
    </>
  );
}

export default function Canvas() {
  return (
    <ReactFlowProvider>
      <CanvasContent />
    </ReactFlowProvider>
  );
}
