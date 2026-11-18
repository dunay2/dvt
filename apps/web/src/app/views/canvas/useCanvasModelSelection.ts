/** Own Model tab selection and delegate protected replacement to the current editor. */
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CanonicalNode } from '../../types/canonical';
import type { WorkspaceScope } from '../../ports/sessionContext';
import { canOpenCanvasRelationalTreeWorkbench } from './useCanvasRelationalTreeWorkbenchModel';
import { useCanvasWorkspaceMenuContributionStore } from './canvasWorkspaceMenuContributionStore';
import type { CanvasModelView } from './canvasWorkspaceMenuContributionStore';
import type { useCanvasWorkbenchFocus } from './useCanvasWorkbenchFocus';
import {
  canvasModelNavigationScopeKey,
  rememberCanvasModelNavigation,
} from './canvasModelNavigationPreference';
import { syncCanvasInspectedModel } from './useCanvasStoreFacade';

export function useCanvasModelSelection(
  canvasId: string | null,
  nodes: readonly CanonicalNode[],
  focus: ReturnType<typeof useCanvasWorkbenchFocus>,
  workspaceScope?: WorkspaceScope,
  projectRoot?: string
) {
  const scopeKey = canvasModelNavigationScopeKey(workspaceScope, canvasId, projectRoot);
  const [selection, setSelection] = useState<Readonly<{
    owner: object;
    id: string;
    initialView: CanvasModelView;
  }> | null>(null);
  const [active, setActive] = useState(true);
  const modelIds = useMemo(
    () => new Set(nodes.filter(canOpenCanvasRelationalTreeWorkbench).map((node) => node.id)),
    [nodes]
  );
  const owner = useMemo(() => ({}), [canvasId, scopeKey]);
  const current = useRef<Readonly<{
    owner: object;
    modelIds: ReadonlySet<string>;
    workspaceScope?: WorkspaceScope;
  }> | null>(null);
  useLayoutEffect(() => {
    current.current = { owner, modelIds, workspaceScope };
    return () => {
      current.current = null;
    };
  }, [owner, modelIds, workspaceScope]);
  const selected =
    selection?.owner === owner
      ? (nodes.find((node) => node.id === selection.id && modelIds.has(node.id)) ?? null)
      : null;
  const { capture, enter, restore } = focus;
  const activate = useCallback(
    (nodeId: string): boolean => {
      if (current.current?.owner !== owner || !current.current.modelIds.has(nodeId)) return false;
      syncCanvasInspectedModel(current.current.workspaceScope, nodeId);
      setActive(true);
      return true;
    },
    [owner]
  );
  const open = useCallback(
    (nodeId: string, view?: CanvasModelView) => {
      if (current.current?.owner !== owner || !current.current.modelIds.has(nodeId)) return;
      capture(undefined, nodeId);
      const select = () => {
        if (!activate(nodeId)) return;
        setSelection({ owner, id: nodeId, initialView: view ?? 'semantic' });
        rememberCanvasModelNavigation(scopeKey, nodeId);
        enter('[data-slot="canvas-model-editor"]');
      };
      const currentTab = useCanvasWorkspaceMenuContributionStore.getState().modelTab;
      if (currentTab?.canvasId === canvasId) {
        if (currentTab.nodeId !== nodeId) currentTab.onClose(select);
        else {
          currentTab.onSelect();
          if (view != null && currentTab.views?.disabled !== true) currentTab.views?.[view]();
        }
      } else select();
    },
    [owner, canvasId, scopeKey, capture, enter, activate]
  );
  const close = useCallback(() => {
    if (current.current?.owner !== owner) return;
    setSelection(null);
    restore();
  }, [owner, restore]);
  return {
    scopeKey,
    modelIds,
    selected,
    initialView: selected == null ? undefined : selection?.initialView,
    active,
    activate: () => {
      if (selected != null) activate(selected.id);
    },
    open,
    close,
    setActive,
  };
}
