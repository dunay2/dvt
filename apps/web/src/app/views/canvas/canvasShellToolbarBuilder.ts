/**
 * Owned concern: build the toolbar concern of the route-owned Canvas shell contract.
 */
import type { CanvasShellToolbar } from './canvasShell.types';
import type { CanvasShellBuilderArgs } from './canvasShellBuilder.types';

export function buildCanvasShellToolbar({
  controller,
  routeViewState,
}: CanvasShellBuilderArgs): CanvasShellToolbar {
  return {
    canvasAuthoringMode: controller.canvasAuthoringMode,
    routeState: routeViewState.presentationState.routeState,
    draftToolbarState: routeViewState.presentationState.draftToolbarState,
    canStartRun: controller.canStartRun,
    planStatusSummary: controller.planStatusSummary,
    exclusiveOverlayMode: controller.exclusiveOverlayMode,
    canUseCostOverlay: controller.canUseCostOverlay,
    impactOverlayEnabled: controller.impactOverlayEnabled,
    columnLevelLineageEnabled: controller.columnLevelLineageEnabled,
    transformationValidation: controller.transformationValidation,
  };
}
