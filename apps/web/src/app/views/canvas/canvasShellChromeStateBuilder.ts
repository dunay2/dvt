/**
 * Owned concern: build the chrome state concern of the route-owned Canvas shell contract.
 */
import type { CanvasShellChromeStateBuilderArgs } from './canvasShellBuilder.types';
import type { CanvasShellChromeState } from './canvasShell.types';

export function buildCanvasShellChromeState({
  chromeStateSource,
  routePresentation,
}: CanvasShellChromeStateBuilderArgs): CanvasShellChromeState {
  return {
    routeState: routePresentation.presentationState.routeState,
    draftStatusState: routePresentation.presentationState.draftStatusState,
    canPlanGraph: chromeStateSource.canPlanGraph,
    canStartRun: chromeStateSource.canStartRun,
    canExportProjectSnapshot: chromeStateSource.canExportProjectSnapshot,
    canImportProjectSnapshot: chromeStateSource.canImportProjectSnapshot,
    planStatusSummary: chromeStateSource.planStatusSummary,
    planRunReadiness: chromeStateSource.planRunReadiness,
    executionSelectionRecovery: chromeStateSource.executionSelectionRecovery,
    exclusiveOverlayMode: chromeStateSource.exclusiveOverlayMode,
    canUseCostOverlay: chromeStateSource.canUseCostOverlay,
    impactOverlayEnabled: chromeStateSource.impactOverlayEnabled,
    columnLevelLineageEnabled: chromeStateSource.columnLevelLineageEnabled,
    transformationValidation: chromeStateSource.transformationValidation,
  };
}
