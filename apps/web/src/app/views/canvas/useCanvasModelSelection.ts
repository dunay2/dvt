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
  type CanvasModelWorkspaceTabContribution,
} from './canvasWorkspaceMenuContributionStore';
import {
  MAX_CANVAS_MODEL_TABS,
  canvasModelWorkspaceTabIds,
  planModelTabSelection,
  type OpenModel,
} from './canvasWorkspaceTabs';
import type { useCanvasWorkbenchFocus } from './useCanvasWorkbenchFocus';
import {
  canvasModelNavigationScopeKey,
  rememberCanvasModelNavigation,
} from './canvasModelNavigationPreference';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';
import { useCanvasModelTabList } from './useCanvasModelTabList';
import { syncCanvasInspectedModel } from './useCanvasStoreFacade';

type Selection = Readonly<{
  owner: object;
  id: string | null;
  opened: readonly OpenModel[];
}>;

function selectPublishedModel(
  tab: CanvasModelWorkspaceTabContribution,
  view: CanvasModelView | undefined
): void {
  tab.onSelect();
  if (view != null && tab.views?.disabled !== true) tab.views?.[view]();
}

export function useCanvasModelSelection({
  canvasId,
  nodes,
  focus,
  workspaceScope,
  projectRoot,
  onActivate,
}: Readonly<{
  canvasId: string | null;
  nodes: readonly CanonicalNode[];
  focus: ReturnType<typeof useCanvasWorkbenchFocus>;
  workspaceScope?: WorkspaceScope;
  projectRoot?: string;
  onActivate?: () => void;
}>) {
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
      setActive(true);
      onActivate?.();
      syncCanvasInspectedModel(state.workspaceScope, nodeId);
      rememberCanvasModelNavigation(scopeKey, nodeId);
    },
    [owner, onActivate, scopeKey]
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
          selectPublishedModel(currentTab, view);
        } else {
          if (view != null)
            commit(
              nodeId,
              state.opened.map((tab) => (tab.id === nodeId ? { id: nodeId, view } : tab))
            );
          activate(nodeId);
        }
        return;
      }
      const select = () => {
        const latest = current.current;
        if (latest?.owner !== owner || !latest.modelIds.has(nodeId)) return;
        const tabs = planModelTabSelection(latest.opened, nodeId, view, currentTab);
        if (tabs == null) return;
        if (!fromTab) capture(undefined, nodeId);
        if (!commit(nodeId, tabs)) return;
        activate(nodeId);
        if (!fromTab) enter('[data-slot="canvas-model-editor"]');
      };
      if (currentTab == null) select();
      else currentTab.onClose(select);
    },
    [owner, canvasId, capture, enter, activate, commit]
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
      const replacementId = visible ? (neighbour?.id ?? null) : null;
      const nextId = closedCurrent ? replacementId : state.selectedId;
      if (!commit(nextId, remaining)) return;
      if (!closedCurrent || !visible) {
        enter('[data-workbench-navigation] [role="tab"][aria-selected="true"]');
      } else if (nextId == null) restore();
      else {
        activate(nextId);
        enter(`[id="${canvasModelWorkspaceTabIds(nextId).tabId}"]`);
      }
    },
    [owner, commit, activate, enter, restore]
  );
  useCanvasModelTabList({ canvasId, eligible, opened, open, close });
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
