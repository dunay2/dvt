/** Owned concern: render the active Canvas workbench tab component or unavailable state. */
import { Suspense, createElement } from 'react';

import type { CanvasWorkbenchTabId } from '../../plugins/contracts/PluginManifest';
import type { CanvasWorkbenchTabViewContribution } from '../../plugins/registry';
import type {
  CanvasWorkbenchTabUnavailableState,
  CanvasWorkbenchTabsReadModel,
} from './canvasWorkbenchTabs';

type CanvasWorkbenchUnavailablePanelProps = Readonly<{
  unavailableState: CanvasWorkbenchTabUnavailableState;
  onSelectTab: (tabId: CanvasWorkbenchTabId) => void;
}>;

function CanvasWorkbenchUnavailablePanel({
  unavailableState,
  onSelectTab,
}: CanvasWorkbenchUnavailablePanelProps): JSX.Element {
  const message =
    unavailableState.kind === 'unknown_tab'
      ? `Unknown Canvas workbench tab: ${unavailableState.requestedTabId}`
      : 'Canvas context is required before scoped workbench tabs can be opened.';

  return (
    <div
      data-slot="canvas-workbench-unavailable-panel"
      className="flex h-full min-h-0 flex-col items-center justify-center gap-3 bg-[var(--surface-route)] p-6 text-center text-[var(--text-default)]"
    >
      <h2 className="text-lg font-semibold">Workbench tab unavailable</h2>
      <p className="max-w-lg text-sm text-[var(--text-muted)]">{message}</p>
      <button
        type="button"
        className="rounded border border-[color:var(--border-default)] px-3 py-2 text-sm text-[var(--text-strong)] hover:bg-[var(--surface-elevated)]"
        onClick={() => onSelectTab(unavailableState.recoveryTabId)}
      >
        Open Graph
      </button>
    </div>
  );
}

export type CanvasWorkbenchTabPanelProps = Readonly<{
  tabsState: CanvasWorkbenchTabsReadModel;
  tabViews: readonly CanvasWorkbenchTabViewContribution[];
  onSelectTab: (tabId: CanvasWorkbenchTabId) => void;
}>;

export function CanvasWorkbenchTabPanel({
  tabsState,
  tabViews,
  onSelectTab,
}: CanvasWorkbenchTabPanelProps): JSX.Element | null {
  if (tabsState.unavailableState != null) {
    return (
      <CanvasWorkbenchUnavailablePanel
        unavailableState={tabsState.unavailableState}
        onSelectTab={onSelectTab}
      />
    );
  }

  if (tabsState.activeTabId === 'graph') {
    return null;
  }

  const activeView = tabViews.find((view) => view.placement.tabId === tabsState.activeTabId);
  return activeView == null ? null : (
    <Suspense fallback={<div className="p-6 text-sm text-[var(--text-muted)]">Loading tab...</div>}>
      {createElement(activeView.component)}
    </Suspense>
  );
}
