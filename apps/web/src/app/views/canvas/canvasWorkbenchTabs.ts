/** Owned concern: project Canvas workbench tab placements into a route-owned read model. */
import { resolveString } from '../../plugins/contracts/PluginManifest';
import type {
  CanvasWorkbenchTabId,
  CanvasWorkbenchTabPlacement,
} from '../../plugins/contracts/PluginManifest';
import type { CanvasWorkbenchRouteState } from './canvasWorkbenchRouteState';
import { buildCanvasWorkbenchTabPath } from './canvasWorkbenchRouteState';

export type CanvasWorkbenchContext =
  | Readonly<{
      kind: 'ready';
    }>
  | Readonly<{
      kind: 'unavailable';
      reason: 'missing_canvas_context';
    }>;

export type CanvasWorkbenchTabReadModel = Readonly<{
  id: CanvasWorkbenchTabId;
  label: string;
  order: number;
  scope: 'canvas' | 'selection' | 'run';
  isEnabled: boolean;
  to: string;
}>;

export type CanvasWorkbenchTabUnavailableState =
  | Readonly<{
      kind: 'unknown_tab';
      requestedTabId: string;
      recoveryTabId: 'graph';
    }>
  | Readonly<{
      kind: 'missing_canvas_context';
      recoveryTabId: 'graph';
    }>;

export type CanvasWorkbenchTabsReadModel = Readonly<{
  activeTabId: CanvasWorkbenchTabId;
  tabs: readonly CanvasWorkbenchTabReadModel[];
  unavailableState: CanvasWorkbenchTabUnavailableState | null;
}>;

export function createGraphCanvasWorkbenchTab(): CanvasWorkbenchTabReadModel {
  return {
    id: 'graph',
    label: 'Graph',
    order: 10,
    scope: 'canvas',
    isEnabled: true,
    to: buildCanvasWorkbenchTabPath('graph'),
  };
}

function assertUniqueCanvasWorkbenchTabs(tabs: readonly CanvasWorkbenchTabReadModel[]): void {
  const seen = new Set<CanvasWorkbenchTabId>();
  for (const tab of tabs) {
    if (seen.has(tab.id)) {
      throw new Error(`duplicate Canvas workbench tab id: ${tab.id}`);
    }

    seen.add(tab.id);
  }
}

function projectPlacementToTab(
  placement: CanvasWorkbenchTabPlacement
): CanvasWorkbenchTabReadModel {
  return {
    id: placement.tabId,
    label: resolveString(placement.label),
    order: placement.order,
    scope: placement.scope,
    isEnabled: true,
    to: buildCanvasWorkbenchTabPath(placement.tabId),
  };
}

export function buildCanvasWorkbenchTabsReadModel(args: {
  placements: readonly CanvasWorkbenchTabPlacement[];
  routeState: CanvasWorkbenchRouteState;
  context: CanvasWorkbenchContext;
}): CanvasWorkbenchTabsReadModel {
  const routeState = args.routeState;
  const graphTab = createGraphCanvasWorkbenchTab();
  const pluginTabs =
    args.context.kind === 'ready'
      ? args.placements.map(projectPlacementToTab).sort((left, right) => left.order - right.order)
      : [];
  const tabs = [graphTab, ...pluginTabs];
  assertUniqueCanvasWorkbenchTabs(tabs);

  if (args.context.kind === 'unavailable') {
    return {
      activeTabId: 'graph',
      tabs,
      unavailableState: {
        kind: args.context.reason,
        recoveryTabId: 'graph',
      },
    };
  }

  if (routeState.kind === 'unavailable') {
    return {
      activeTabId: 'graph',
      tabs,
      unavailableState: {
        kind: 'unknown_tab',
        requestedTabId: routeState.requestedTabId,
        recoveryTabId: routeState.recoveryTabId,
      },
    };
  }

  const activeTabId = tabs.some((tab) => tab.id === routeState.tabId) ? routeState.tabId : 'graph';
  return {
    activeTabId,
    tabs,
    unavailableState: null,
  };
}
