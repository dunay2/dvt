/** Own Model tab selection and delegate protected replacement to the current editor. */
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CanonicalNode } from '../../types/canonical';
import { canOpenCanvasRelationalTreeWorkbench } from './useCanvasRelationalTreeWorkbenchModel';
import { useCanvasWorkspaceMenuContributionStore } from './canvasWorkspaceMenuContributionStore';
import type { CanvasModelView } from './canvasWorkspaceMenuContributionStore';
import type { useCanvasWorkbenchFocus } from './useCanvasWorkbenchFocus';
import { rememberCanvasModelNavigation } from './canvasModelNavigationPreference';

export function useCanvasModelSelection(
  canvasId: string | null,
  nodes: readonly CanonicalNode[],
  focus: ReturnType<typeof useCanvasWorkbenchFocus>,
  scopeKey: string | null = null
) {
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
  const current = useRef<Readonly<{ owner: object; modelIds: ReadonlySet<string> }> | null>(null);
  useLayoutEffect(() => {
    current.current = { owner, modelIds };
    return () => {
      current.current = null;
    };
  }, [owner, modelIds]);
  const selected =
    selection?.owner === owner
      ? (nodes.find((node) => node.id === selection.id && modelIds.has(node.id)) ?? null)
      : null;
  const { capture, enter, restore } = focus;
  const open = useCallback(
    (nodeId: string, view?: CanvasModelView) => {
      if (current.current?.owner !== owner || !current.current.modelIds.has(nodeId)) return;
      capture(undefined, nodeId);
      const select = () => {
        if (current.current?.owner !== owner || !current.current.modelIds.has(nodeId)) return;
        setSelection({ owner, id: nodeId, initialView: view ?? 'semantic' });
        rememberCanvasModelNavigation(scopeKey, nodeId);
        setActive(true);
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
    [owner, canvasId, scopeKey, capture, enter]
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
    open,
    close,
    setActive,
  };
}
