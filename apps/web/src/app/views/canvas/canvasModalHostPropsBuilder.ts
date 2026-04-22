/**
 * Owned concern: adapt route-controller state into the semantic CanvasModalHost contract.
 */
import type { useCanvasController } from './useCanvasController';
import type { CanvasModalHostProps } from './canvasModalHost.types';

type CanvasController = ReturnType<typeof useCanvasController>;

type CanvasModalHostBuilderSource = Readonly<
  Pick<
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
  >
>;

export function buildCanvasModalHostProps(
  controller: CanvasModalHostBuilderSource
): CanvasModalHostProps {
  return {
    planPreview: {
      open: controller.planModalOpen,
      plan: controller.currentPlan,
      canStartRun: controller.canStartRun,
      planStatusSummary: controller.planStatusSummary,
      onClose: () => controller.setPlanModalOpen(false),
      onStartRun: () => {
        void controller.handleStartRun();
      },
    },
    edgeConfirmation: {
      open: controller.confirmEdgeModal.open,
      edge: controller.confirmEdgeModal.edge,
      onClose: () => controller.setConfirmEdgeModal({ open: false, edge: null }),
      onConfirm: controller.confirmEdgeCreation,
    },
  };
}
