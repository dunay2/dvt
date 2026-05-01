/** Owned concern: build the layout concern of the route-owned Canvas shell contract. */
import type { ReactNode } from 'react';

import { CanvasReadOnlyBannerView } from './CanvasStateViews';
import { CanvasPlaygroundTabStrip } from './CanvasPlaygroundTabStrip';
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

function renderCanvasShellHostTabStrip(
  authoringCommands: CanvasShellLayoutBuilderArgs['authoringCommands'],
  routePresentation: Pick<
    CanvasShellLayoutBuilderArgs['routePresentation'],
    'availableCanvasKinds' | 'canvasTabState' | 'effectiveUserPermissions'
  >
): ReactNode {
  if (routePresentation.canvasTabState.tabs.length === 0) {
    return null;
  }

  return (
    <CanvasPlaygroundTabStrip
      tabState={routePresentation.canvasTabState}
      availableCanvasKinds={routePresentation.availableCanvasKinds}
      canEditEdges={routePresentation.effectiveUserPermissions.canEditEdges}
      onCreateCanvasDocument={(command) => {
        void authoringCommands.handleCreateCanvasDocument(command);
      }}
    />
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
    hostTabState: routePresentation.canvasTabState,
    centerSurfaceMode,
    hostTabStrip: renderCanvasShellHostTabStrip(authoringCommands, routePresentation),
    centerSurface: renderCanvasCenterSurface({
      presentationState: routePresentation.presentationState,
      startupBlockState: routePresentation.startupBlockState,
      draftTransportError: routePresentation.draftTransportError,
      workbenchErrorMessage: routePresentation.workbenchErrorMessage,
      canvasDocument: routePresentation.canvasDocument,
      draftSaveStatus: routePresentation.draftSaveStatus,
      availableCanvasKinds: routePresentation.availableCanvasKinds,
      canEditEdges: routePresentation.effectiveUserPermissions.canEditEdges,
      canOpenSourceImport: layoutState.canOpenSourceImport,
      onCreateCanvasDocument: (command) => {
        void authoringCommands.handleCreateCanvasDocument(command);
      },
      onCreateAuthoringNode: authoringCommands.handleCreateAuthoringNode,
    }),
    readOnlyBanner: renderCanvasShellReadOnlyBanner(recoveryCommands, routePresentation),
  };
}
