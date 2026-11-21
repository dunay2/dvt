/** Own the scoped list of open Model tabs and the current guarded editor. */
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { CanonicalNode } from '../../types/canonical';
import type { WorkspaceScope } from '../../ports/sessionContext';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { canOpenCanvasRelationalTreeWorkbench } from './useCanvasRelationalTreeWorkbenchModel';
import {
  useCanvasWorkspaceMenuContributionStore,
  type CanvasModelView,
} from './canvasWorkspaceMenuContributionStore';
import { MAX_CANVAS_MODEL_TABS, canvasModelWorkspaceTabIds } from './canvasWorkspaceTabs';
import type { useCanvasWorkbenchFocus } from './useCanvasWorkbenchFocus';
import {
  canvasModelNavigationScopeKey,
  rememberCanvasModelNavigation,
} from './canvasModelNavigationPreference';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';
import { syncCanvasInspectedModel } from './useCanvasStoreFacade';

type OpenModel = Readonly<{ id: string; view: CanvasModelView }>;
type Selection = Readonly<{
  owner: object;
  id: string | null;
  opened: readonly OpenModel[];
}>;

export function useCanvasModelSelection(
  canvasId: string | null,
  nodes: readonly CanonicalNode[],
  focus: ReturnType<typeof useCanvasWorkbenchFocus>,
  workspaceScope?: WorkspaceScope,
  projectRoot?: string
) {
  const scopeKey = canvasModelNavigationScopeKey(workspaceScope, canvasId, projectRoot);
  const owner = useMemo(() => ({}), [canvasId, scopeKey, projectRoot]);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [active, setActive] = useState(true);
  const eligible = useMemo(
    () =>
      new Map(nodes.filter(canOpenCanvasRelationalTreeWorkbench).map((node) => [node.id, node])),
    [nodes]
  );
  const modelIds = useMemo(() => new Set(eligible.keys()), [eligible]);
  const opened = useMemo(
    () => (selection?.owner === owner ? selection.opened.filter(({ id }) => eligible.has(id)) : []),
    [eligible, owner, selection]
  );
  const selected = selection?.owner === owner ? (eligible.get(selection.id ?? '') ?? null) : null;
  const current = useRef<{
    owner: object;
    modelIds: ReadonlySet<string>;
    opened: readonly OpenModel[];
    selectedId: string | null;
    workspaceScope?: WorkspaceScope;
  } | null>(null);
  useLayoutEffect(() => {
    current.current = { owner, modelIds, opened, selectedId: selected?.id ?? null, workspaceScope };
    return () => {
      current.current = null;
    };
  }, [owner, modelIds, opened, selected, workspaceScope]);
  const { capture, enter, restore } = focus;
  const commit = useCallback(
    (id: string | null, tabs: readonly OpenModel[]): boolean => {
      const state = current.current;
      if (state?.owner !== owner) return false;
      state.opened = tabs;
      state.selectedId = id;
      setSelection({ owner, id, opened: tabs });
      return true;
    },
    [owner]
  );
  const activate = useCallback(
    (nodeId: string): void => {
      const state = current.current;
      if (state?.owner !== owner || state.selectedId !== nodeId) return;
      syncCanvasInspectedModel(state.workspaceScope, nodeId);
      setActive(true);
    },
    [owner]
  );
  const open = useCallback(
    (nodeId: string, view?: CanvasModelView, fromTab = false) => {
      const state = current.current;
      if (state?.owner !== owner || !state.modelIds.has(nodeId)) return;
      if (
        state.opened.length >= MAX_CANVAS_MODEL_TABS &&
        !state.opened.some(({ id }) => id === nodeId)
      ) {
        const copy = resolveCanvasSemanticEditorCopy(
          useApplicationLanguageStore.getState().language
        );
        toast.info(copy.modelTabLimit.replace('{limit}', String(MAX_CANVAS_MODEL_TABS)));
        return;
      }
      const published = useCanvasWorkspaceMenuContributionStore.getState().modelTab;
      const currentTab =
        published?.canvasId === canvasId && published.nodeId === state.selectedId
          ? published
          : null;
      if (state.selectedId === nodeId) {
        if (currentTab != null) {
          currentTab.onSelect();
          if (view != null && currentTab.views?.disabled !== true) currentTab.views?.[view]();
        } else {
          if (view != null)
            commit(
              nodeId,
              state.opened.map((tab) => (tab.id === nodeId ? { id: nodeId, view } : tab))
            );
          activate(nodeId);
        }
        rememberCanvasModelNavigation(scopeKey, nodeId);
        return;
      }
      const select = () => {
        const latest = current.current;
        if (latest?.owner !== owner || !latest.modelIds.has(nodeId)) return;
        const existing = latest.opened.find(({ id }) => id === nodeId);
        if (existing == null && latest.opened.length >= MAX_CANVAS_MODEL_TABS) return;
        const next = { id: nodeId, view: view ?? existing?.view ?? 'semantic' };
        const tabs = latest.opened.map((tab) =>
          tab.id === nodeId
            ? next
            : tab.id === currentTab?.nodeId && currentTab.views != null
              ? { ...tab, view: currentTab.views.active }
              : tab
        );
        if (!fromTab) capture(undefined, nodeId);
        if (!commit(nodeId, existing == null ? [...tabs, next] : tabs)) return;
        activate(nodeId);
        rememberCanvasModelNavigation(scopeKey, nodeId);
        if (!fromTab) enter('[data-slot="canvas-model-editor"]');
      };
      if (currentTab == null) select();
      else currentTab.onClose(select);
    },
    [owner, canvasId, scopeKey, capture, enter, activate, commit]
  );
  const close = useCallback(
    (nodeId: string, visible: boolean) => {
      const state = current.current;
      if (state?.owner !== owner) return;
      const index = state.opened.findIndex(({ id }) => id === nodeId);
      if (index < 0) return;
      const remaining = state.opened.filter(({ id }) => id !== nodeId);
      const closedCurrent = state.selectedId === nodeId;
      const neighbour = remaining[index] ?? remaining.at(-1);
      const nextId = closedCurrent ? (visible ? (neighbour?.id ?? null) : null) : state.selectedId;
      if (!commit(nextId, remaining)) return;
      if (closedCurrent && nextId != null) {
        activate(nextId);
        rememberCanvasModelNavigation(scopeKey, nextId);
        enter(`[id="${canvasModelWorkspaceTabIds(nextId).tabId}"]`);
      } else if (closedCurrent && visible) restore();
      else enter('[data-workbench-navigation] [role="tab"][aria-selected="true"]');
    },
    [owner, commit, activate, enter, restore, scopeKey]
  );
  useLayoutEffect(() => {
    if (canvasId == null || opened.length === 0) return;
    const store = useCanvasWorkspaceMenuContributionStore.getState();
    const list = {
      canvasId,
      tabs: opened.map(({ id }) => ({
        nodeId: id,
        label: eligible.get(id)!.name,
        onSelect: () => open(id, undefined, true),
        onClose: () => {
          const tab = useCanvasWorkspaceMenuContributionStore.getState().modelTab;
          if (tab?.canvasId === canvasId && tab.nodeId === id) tab.onClose();
          else close(id, false);
        },
      })),
    };
    store.registerModelTabList(list);
    return () => store.clearModelTabList(list);
  }, [canvasId, eligible, opened, open, close]);

  return {
    scopeKey,
    modelIds,
    selected,
    openModelIds: opened.map(({ id }) => id),
    initialView: opened.find(({ id }) => id === selected?.id)?.view,
    active,
    activate: () => {
      if (selected != null) activate(selected.id);
    },
    open,
    close,
    setActive,
  };
}
