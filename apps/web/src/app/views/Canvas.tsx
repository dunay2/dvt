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
import { buildCanvasWorkbenchLogEntries } from './canvas/canvasWorkbenchLogEntries';
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
  const canvasWorkbenchLogState = buildCanvasWorkbenchLogEntries({
    presentation: routeViewState.presentationState,
    draft: controller.draftAccessPosture,
    toolbar: {
      planRunReadiness: shellProps.toolbar.planRunReadiness,
      canPlanGraph: shellProps.toolbar.canPlanGraph,
      canStartRun: shellProps.toolbar.canStartRun,
      planStatusSummary: shellProps.toolbar.planStatusSummary,
    },
    permissions: shellProps.panels.userPermissions,
    graph: {
      nodeCount: shellProps.graph.nodesWithImpact.length,
      edgeCount: shellProps.graph.edges.length,
    },
    selection: {
      inspectorNodeName: shellProps.panels.inspectorNode?.name ?? null,
      activeRunId: shellProps.panels.activeRunId,
    },
  });
  const activeWorkbenchTab = canvasWorkbenchTabsState.tabs.find(
    (tab) => tab.id === canvasWorkbenchTabsState.activeTabId
  );
  const hasPrimaryCanvasBlocker = [
    'loading_backend',
    'blocked_backend',
    'loading_graph',
    'error_graph',
  ].includes(presentationState.routeState);
  const shouldReplaceCenterSurfaceWithWorkbenchTab =
    canvasWorkbenchTabsState.unavailableState == null &&
    activeWorkbenchTab?.scope === 'workspace' &&
    activeWorkbenchTab.id !== 'graph' &&
    !hasPrimaryCanvasBlocker;
  const layout = {
    ...shellProps.layout,
    centerSurface: shouldReplaceCenterSurfaceWithWorkbenchTab
      ? undefined
      : shellProps.layout.centerSurface,
    workbenchTabStrip: (
      <CanvasWorkbenchTabStrip
        tabsState={canvasWorkbenchTabsState}
        onSelectTab={handleSelectWorkbenchTab}
        variant="inline"
      />
    ),
    workbenchTabPanel:
      canvasWorkbenchTabsState.activeTabId === 'graph' &&
      canvasWorkbenchTabsState.unavailableState == null ? undefined : (
        <CanvasWorkbenchTabPanel
          tabsState={canvasWorkbenchTabsState}
          tabViews={canvasWorkbenchTabViews}
          logState={canvasWorkbenchLogState}
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
