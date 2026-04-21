/**
 * Owned concern: host Canvas-owned modal overlays outside the shell layout.
 */
import { ConfirmEdgeModal, PlanPreviewModal } from '../../components/Modals';
import type { useCanvasController } from './useCanvasController';

type CanvasController = ReturnType<typeof useCanvasController>;

type CanvasModalHostController = Pick<
  CanvasController,
  | 'planModalOpen'
  | 'setPlanModalOpen'
  | 'currentPlan'
  | 'canStartRun'
  | 'planStatusSummary'
  | 'handleStartRun'
  | 'confirmEdgeModal'
  | 'setConfirmEdgeModal'
  | 'confirmEdgeCreation'
>;

type CanvasModalHostProps = Readonly<{
  controller: CanvasModalHostController;
}>;

export default function CanvasModalHost({
  controller,
}: CanvasModalHostProps) {
  return (
    <>
      <PlanPreviewModal
        open={controller.planModalOpen}
        onClose={() => controller.setPlanModalOpen(false)}
        plan={controller.currentPlan}
        startRunDisabled={!controller.canStartRun}
        startRunMessage={controller.planStatusSummary}
        onStartRun={() => {
          void controller.handleStartRun();
        }}
      />

      <ConfirmEdgeModal
        open={controller.confirmEdgeModal.open}
        onClose={() => controller.setConfirmEdgeModal({ open: false, edge: null })}
        edge={controller.confirmEdgeModal.edge}
        onConfirm={controller.confirmEdgeCreation}
      />
    </>
  );
}
