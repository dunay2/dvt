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
        onAdoptCurrentWorkspaceSnapshot={recoveryCommands.adoptCurrentWorkspaceSnapshot}
      />
      <CanvasReadOnlyBannerView state={routePresentation.readOnlyState} />
    </>
  );
}

export function buildCanvasShellLayout({
  layoutState,
  recoveryCommands,
  routePresentation,
}: CanvasShellLayoutBuilderArgs): CanvasShellLayout {
  return {
    focusMode: layoutState.focusMode,
    explorerPanelVisible: layoutState.explorerPanelVisible,
    inspectorPanelVisible: layoutState.inspectorPanelVisible,
    centerSurface: renderCanvasCenterSurface({
      presentationState: routePresentation.presentationState,
      draftTransportError: routePresentation.draftTransportError,
      canEditEdges: routePresentation.effectiveUserPermissions.canEditEdges,
    }),
    readOnlyBanner: renderCanvasShellReadOnlyBanner(recoveryCommands, routePresentation),
  };
}
