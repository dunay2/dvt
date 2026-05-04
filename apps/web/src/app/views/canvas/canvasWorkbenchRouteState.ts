/** Owned concern: parse and build Canvas workbench tab route commands without JSX. */
import type { CanvasWorkbenchTabId } from '../../plugins/contracts/PluginManifest';

export type CanvasWorkbenchRouteState =
  | Readonly<{
      kind: 'selected';
      tabId: CanvasWorkbenchTabId;
    }>
  | Readonly<{
      kind: 'unavailable';
      requestedTabId: string;
      recoveryTabId: 'graph';
    }>;

export type CanvasWorkbenchTabSelectionCommandResult =
  | Readonly<{
      kind: 'accepted';
      to: string;
    }>
  | Readonly<{
      kind: 'rejected';
      reason: 'unknown_or_disabled_tab';
    }>;

const CANVAS_WORKBENCH_TAB_IDS = new Set<CanvasWorkbenchTabId>([
  'graph',
  'code',
  'lineage',
  'diff',
  'artifacts',
  'runs',
]);

export function isCanvasWorkbenchTabId(value: string): value is CanvasWorkbenchTabId {
  return CANVAS_WORKBENCH_TAB_IDS.has(value as CanvasWorkbenchTabId);
}

export function parseCanvasWorkbenchRouteState(
  workbenchTab: string | undefined
): CanvasWorkbenchRouteState {
  if (workbenchTab == null || workbenchTab.trim() === '') {
    return {
      kind: 'selected',
      tabId: 'graph',
    };
  }

  const normalizedTabId = workbenchTab.trim().toLowerCase();
  if (isCanvasWorkbenchTabId(normalizedTabId)) {
    return {
      kind: 'selected',
      tabId: normalizedTabId,
    };
  }

  return {
    kind: 'unavailable',
    requestedTabId: workbenchTab,
    recoveryTabId: 'graph',
  };
}

export function buildCanvasWorkbenchTabPath(tabId: CanvasWorkbenchTabId): string {
  return tabId === 'graph' ? '/canvas' : `/canvas/${tabId}`;
}

export function resolveCanvasWorkbenchTabSelectionCommand(args: {
  tabId: CanvasWorkbenchTabId;
  enabledTabIds: readonly CanvasWorkbenchTabId[];
}): CanvasWorkbenchTabSelectionCommandResult {
  return args.enabledTabIds.includes(args.tabId)
    ? {
        kind: 'accepted',
        to: buildCanvasWorkbenchTabPath(args.tabId),
      }
    : {
        kind: 'rejected',
        reason: 'unknown_or_disabled_tab',
      };
}
