/** Owned concern: project Canvas workbench tab placements into a route-owned read model. */
import type {
  CanvasWorkbenchTabId,
  CanvasWorkbenchTabPlacement,
} from '../../plugins/contracts/PluginManifest';
import type { CanvasWorkbenchRouteState } from './canvasWorkbenchRouteState';
import { buildCanvasWorkbenchTabPath } from './canvasWorkbenchRouteState';
import type { CanvasViewCopy } from './copy';
import { canvasViewCopy } from './copy';

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

type CanvasWorkbenchTabsCopy = Pick<
  CanvasViewCopy,
  | 'workbenchGraphTabLabel'
  | 'workbenchCodeTabLabel'
  | 'workbenchLineageTabLabel'
  | 'workbenchDiffTabLabel'
  | 'workbenchArtifactsTabLabel'
  | 'workbenchRunsTabLabel'
>;

const CANVAS_WORKBENCH_TAB_LABEL_KEYS = {
  graph: 'workbenchGraphTabLabel',
  code: 'workbenchCodeTabLabel',
  lineage: 'workbenchLineageTabLabel',
  diff: 'workbenchDiffTabLabel',
  artifacts: 'workbenchArtifactsTabLabel',
  runs: 'workbenchRunsTabLabel',
} satisfies Record<CanvasWorkbenchTabId, keyof CanvasWorkbenchTabsCopy>;

export function resolveCanvasWorkbenchTabLabel(
  tabId: CanvasWorkbenchTabId,
  copy: CanvasWorkbenchTabsCopy = canvasViewCopy
): string {
  return copy[CANVAS_WORKBENCH_TAB_LABEL_KEYS[tabId]];
}

export function createGraphCanvasWorkbenchTab(
  copy: CanvasWorkbenchTabsCopy = canvasViewCopy
): CanvasWorkbenchTabReadModel {
  return {
    id: 'graph',
    label: resolveCanvasWorkbenchTabLabel('graph', copy),
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
  placement: CanvasWorkbenchTabPlacement,
  copy: CanvasWorkbenchTabsCopy
): CanvasWorkbenchTabReadModel {
  return {
    id: placement.tabId,
    label: resolveCanvasWorkbenchTabLabel(placement.tabId, copy),
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
  copy?: CanvasWorkbenchTabsCopy;
}): CanvasWorkbenchTabsReadModel {
  const routeState = args.routeState;
  const copy = args.copy ?? canvasViewCopy;
  const graphTab = createGraphCanvasWorkbenchTab(copy);
  const pluginTabs =
    args.context.kind === 'ready'
      ? args.placements
          .map((placement) => projectPlacementToTab(placement, copy))
          .sort((left, right) => left.order - right.order)
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
