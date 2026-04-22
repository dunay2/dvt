/**
 * Owned concern: build the toolbar concern of the route-owned Canvas shell contract.
 */
import type { CanvasShellToolbarBuilderArgs } from './canvasShellBuilder.types';
import type { CanvasShellToolbar } from './canvasShell.types';

export function buildCanvasShellToolbar({
  toolbarState,
  routePresentation,
}: CanvasShellToolbarBuilderArgs): CanvasShellToolbar {
  return {
    canvasAuthoringMode: toolbarState.canvasAuthoringMode,
    routeState: routePresentation.presentationState.routeState,
    draftToolbarState: routePresentation.presentationState.draftToolbarState,
    canStartRun: toolbarState.canStartRun,
    planStatusSummary: toolbarState.planStatusSummary,
    exclusiveOverlayMode: toolbarState.exclusiveOverlayMode,
    canUseCostOverlay: toolbarState.canUseCostOverlay,
    impactOverlayEnabled: toolbarState.impactOverlayEnabled,
    columnLevelLineageEnabled: toolbarState.columnLevelLineageEnabled,
    transformationValidation: toolbarState.transformationValidation,
  };
}
