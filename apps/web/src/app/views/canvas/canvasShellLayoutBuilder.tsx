/**
 * Owned concern: build the layout concern of the route-owned Canvas shell contract.
 */
import type { ReactNode } from 'react';

import { CanvasReadOnlyBannerView } from './CanvasStateViews';
import { renderCanvasCenterSurface } from './CanvasCenterSurface';
import { CanvasRecoveryBanner } from './CanvasRecoveryBanner';
import type { CanvasShellLayout } from './canvasShell.types';
import type { CanvasController, CanvasShellBuilderArgs } from './canvasShellBuilder.types';
import type { CanvasRouteViewState } from './canvasRouteViewState';

function renderCanvasShellReadOnlyBanner(
  controller: Pick<CanvasController, 'adoptCurrentWorkspaceSnapshot' | 'reloadLatestDraft'>,
  routeViewState: Pick<CanvasRouteViewState, 'presentationState' | 'readOnlyState'>
): ReactNode {
  return (
    <>
      <CanvasRecoveryBanner
        presentationState={routeViewState.presentationState}
        onReloadLatestDraft={controller.reloadLatestDraft}
        onAdoptCurrentWorkspaceSnapshot={controller.adoptCurrentWorkspaceSnapshot}
      />
      <CanvasReadOnlyBannerView state={routeViewState.readOnlyState} />
    </>
  );
}

export function buildCanvasShellLayout({
  controller,
  routeViewState,
}: CanvasShellBuilderArgs): CanvasShellLayout {
  return {
    focusMode: controller.focusMode,
    explorerPanelVisible: controller.explorerPanelVisible,
    inspectorPanelVisible: controller.inspectorPanelVisible,
    centerSurface: renderCanvasCenterSurface({
      presentationState: routeViewState.presentationState,
      draftTransportError: routeViewState.draftTransportError,
      canEditEdges: routeViewState.effectiveUserPermissions.canEditEdges,
    }),
    readOnlyBanner: renderCanvasShellReadOnlyBanner(controller, routeViewState),
  };
}
