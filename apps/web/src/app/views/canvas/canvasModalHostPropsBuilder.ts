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
    | 'latestPreviewOutcome'
    | 'canStartRun'
    | 'planRunReadiness'
    | 'handleStartRun'
  >
>;

export function buildCanvasModalHostProps(
  controller: CanvasModalHostBuilderSource
): CanvasModalHostProps {
  return {
    planPreview: {
      open: controller.planModalOpen,
      plan: controller.currentPlan,
      outcome: controller.latestPreviewOutcome,
      canStartRun: controller.canStartRun,
      startRunMessage: controller.planRunReadiness.summary,
      onClose: () => controller.setPlanModalOpen(false),
      onStartRun: () => {
        void controller.handleStartRun();
      },
    },
  };
}
