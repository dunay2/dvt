/**
 * Owned concern: build the layout concern of the route-owned Canvas shell contract.
 */
import type { ReactNode } from 'react';

import { CanvasReadOnlyBannerView } from './CanvasStateViews';
import { renderCanvasCenterSurface } from './CanvasCenterSurface';
import { CanvasRecoveryBanner } from './CanvasRecoveryBanner';
import type { CanvasShellLayoutBuilderArgs } from './canvasShellBuilder.types';
import type { CanvasShellLayout } from './canvasShell.types';

function renderCanvasShellReadOnlyBanner(
  recoveryCommands: CanvasShellLayoutBuilderArgs['recoveryCommands'],
  routePresentation: Pick<
    CanvasShellLayoutBuilderArgs['routePresentation'],
    'presentationState' | 'readOnlyState'
  >
): ReactNode {
  return (
    <>
      <CanvasRecoveryBanner
        presentationState={routePresentation.presentationState}
        onReloadLatestDraft={recoveryCommands.reloadLatestDraft}
      />
      <CanvasReadOnlyBannerView state={routePresentation.readOnlyState} />
    </>
  );
}

export function buildCanvasShellLayout({
  authoringCommands,
  layoutState,
  recoveryCommands,
  routePresentation,
}: CanvasShellLayoutBuilderArgs): CanvasShellLayout {
  const centerSurfaceMode =
    routePresentation.presentationState.routeState === 'empty' &&
    routePresentation.effectiveUserPermissions.canEditEdges
      ? 'overlay'
      : 'replace';

  return {
    focusMode: layoutState.focusMode,
    explorerPanelVisible: layoutState.explorerPanelVisible,
    inspectorPanelVisible: layoutState.inspectorPanelVisible,
    canOpenSourceImport: layoutState.canOpenSourceImport,
    centerSurfaceMode,
    centerSurface: renderCanvasCenterSurface({
      presentationState: routePresentation.presentationState,
      startupBlockState: routePresentation.startupBlockState,
      draftTransportError: routePresentation.draftTransportError,
      workbenchErrorMessage: routePresentation.workbenchErrorMessage,
      canvasDocument: routePresentation.canvasDocument,
      availableCanvasKinds: routePresentation.availableCanvasKinds,
      canEditEdges: routePresentation.effectiveUserPermissions.canEditEdges,
      canOpenSourceImport: layoutState.canOpenSourceImport,
      onCreateCanvasDocument: authoringCommands.handleCreateCanvasDocument,
      onCreateAuthoringNode: authoringCommands.handleCreateAuthoringNode,
    }),
    readOnlyBanner: renderCanvasShellReadOnlyBanner(recoveryCommands, routePresentation),
  };
}
