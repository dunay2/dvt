/** Owned concern: build the layout concern of the route-owned Canvas shell contract. */
import type { ReactNode } from 'react';

import { CanvasReadOnlyBannerView } from './CanvasStateViews';
import { renderCanvasCenterSurface } from './CanvasCenterSurface';
import { CanvasRecoveryBanner } from './CanvasRecoveryBanner';
import { resolveCanvasDraftAccessRecoveryCommand } from './canvasDraftAccessPostureModel';
import type { CanvasShellLayoutBuilderArgs } from './canvasShellBuilder.types';
import type { CanvasShellLayout } from './canvasShell.types';

function focusWorkspaceScopeControls(): void {
  document
    .querySelector<HTMLElement>(
      [
        '[data-slot="shell-workspace-context-trigger"]',
        '[data-slot="shell-workspace-menu-trigger"]',
        '[data-slot="select-trigger"]',
      ].join(',')
    )
    ?.focus();
}

function renderCanvasShellReadOnlyBanner(
  recoveryCommands: CanvasShellLayoutBuilderArgs['recoveryCommands'],
  routePresentation: Pick<
    CanvasShellLayoutBuilderArgs['routePresentation'],
    'presentationState' | 'draftAccessPosture' | 'readOnlyState'
  >
): ReactNode {
  return (
    <>
      <CanvasRecoveryBanner
        presentationState={routePresentation.presentationState}
        draftAccessPosture={routePresentation.draftAccessPosture}
        onDraftAccessRecoveryAction={resolveCanvasDraftAccessRecoveryCommand({
          posture: routePresentation.draftAccessPosture,
          reloadLatestDraft: recoveryCommands.reloadLatestDraft,
          refetchDraftAfterAuthRefresh: recoveryCommands.refetchDraftAfterAuthRefresh,
          focusScopeControls: focusWorkspaceScopeControls,
        })}
      />
      <CanvasReadOnlyBannerView
        state={routePresentation.readOnlyState}
        onRequestExecutableScope={
          routePresentation.draftAccessPosture.kind === 'read_only'
            ? focusWorkspaceScopeControls
            : undefined
        }
      />
    </>
  );
}

export function buildCanvasShellLayout({
  authoringCommands,
  layoutState,
  recoveryCommands,
  routePresentation,
}: CanvasShellLayoutBuilderArgs): CanvasShellLayout {
  return {
    focusMode: layoutState.focusMode,
    inspectorPanelVisible: layoutState.inspectorPanelVisible,
    canOpenSourceImport: layoutState.canOpenSourceImport,
    surfaceStrategy: layoutState.canvasSurfaceStrategy,
    centerSurface: renderCanvasCenterSurface({
      presentationState: routePresentation.presentationState,
      workspaceScope: routePresentation.workspaceScope,
      startupBlockState: routePresentation.startupBlockState,
      draftTransportError: routePresentation.draftTransportError,
      workbenchErrorMessage: routePresentation.workbenchErrorMessage,
      canvasDocument: routePresentation.canvasDocument,
      draftSaveStatus: routePresentation.draftSaveStatus,
      availableCanvasKinds: routePresentation.availableCanvasKinds,
      canCreateCanvasDocument: routePresentation.canCreateCanvasDocument,
      onCreateCanvasDocument: (command) => {
        void authoringCommands.handleCreateCanvasDocument(command);
      },
    }),
    readOnlyBanner: renderCanvasShellReadOnlyBanner(recoveryCommands, routePresentation),
  };
}
