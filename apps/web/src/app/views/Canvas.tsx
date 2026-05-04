/**
 * Owned concern: route composition for the governed Canvas shell.
 */
import { ReactFlowProvider } from '@xyflow/react';
import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router';

import CanvasModalHost from './canvas/CanvasModalHost';
import CanvasShell from './canvas/CanvasShell';
import { CanvasWorkbenchTabPanel } from './canvas/CanvasWorkbenchTabPanel';
import { CanvasWorkbenchTabStrip } from './canvas/CanvasWorkbenchTabStrip';
import { buildCanvasModalHostProps } from './canvas/canvasModalHostPropsBuilder';
import { deriveCanvasRouteViewState } from './canvas/canvasRouteViewState';
import { buildCanvasShellProps } from './canvas/canvasShellPropsBuilder';
import { parseCanvasWorkbenchRouteState } from './canvas/canvasWorkbenchRouteState';
import { resolveCanvasWorkbenchTabSelectionCommand } from './canvas/canvasWorkbenchRouteState';
import { buildCanvasWorkbenchTabsReadModel } from './canvas/canvasWorkbenchTabs';
import { useCanvasRoutePresentationSync } from './canvas/useCanvasRoutePresentationSync';
import { useCanvasController } from './canvas/useCanvasController';
import { getCanvasWorkbenchTabViews } from '../plugins/registry';
import type { CanvasWorkbenchTabId } from '../plugins/contracts/PluginManifest';

function CanvasContent(): JSX.Element {
  const navigate = useNavigate();
  const params = useParams();
  const controller = useCanvasController();
  const routeViewState = deriveCanvasRouteViewState(controller);
  const { presentationState } = routeViewState;
  const canvasWorkbenchTabViews = useMemo(
    () => getCanvasWorkbenchTabViews(controller.runtimeCapabilities),
    [controller.runtimeCapabilities]
  );
  const canvasWorkbenchRouteState = parseCanvasWorkbenchRouteState(params.workbenchTab);
  const canvasWorkbenchTabsState = buildCanvasWorkbenchTabsReadModel({
    placements: canvasWorkbenchTabViews.map((view) => view.placement),
    routeState: canvasWorkbenchRouteState,
    context:
      routeViewState.canvasDocument == null
        ? { kind: 'unavailable', reason: 'missing_canvas_context' }
        : { kind: 'ready' },
  });
  const handleSelectWorkbenchTab = (tabId: CanvasWorkbenchTabId) => {
    const result = resolveCanvasWorkbenchTabSelectionCommand({
      tabId,
      enabledTabIds: canvasWorkbenchTabsState.tabs.map((tab) => tab.id),
    });
    if (result.kind === 'accepted') {
      void navigate(result.to);
    }
  };

  useCanvasRoutePresentationSync(presentationState);

  const shellProps = buildCanvasShellProps({
    controller,
    routeViewState,
  });
  const layout = {
    ...shellProps.layout,
    workbenchTabStrip: (
      <CanvasWorkbenchTabStrip
        tabsState={canvasWorkbenchTabsState}
        onSelectTab={handleSelectWorkbenchTab}
      />
    ),
    workbenchTabPanel:
      canvasWorkbenchTabsState.activeTabId === 'graph' &&
      canvasWorkbenchTabsState.unavailableState == null ? undefined : (
        <CanvasWorkbenchTabPanel
          tabsState={canvasWorkbenchTabsState}
          tabViews={canvasWorkbenchTabViews}
          onSelectTab={handleSelectWorkbenchTab}
        />
      ),
  };
  const modalHostProps = buildCanvasModalHostProps(controller);

  return (
    <>
      <CanvasShell {...shellProps} layout={layout} />
      <CanvasModalHost {...modalHostProps} />
    </>
  );
}

export default function Canvas(): JSX.Element {
  return (
    <ReactFlowProvider>
      <CanvasContent />
    </ReactFlowProvider>
  );
}
