/** Own Model tab selection and delegate protected replacement to the current editor. */
import { useCallback, useMemo, useRef, useState } from 'react';
import type { CanonicalNode } from '../../types/canonical';
import { canOpenCanvasRelationalTreeWorkbench } from './useCanvasRelationalTreeWorkbenchModel';
import { useCanvasWorkspaceMenuContributionStore } from './canvasWorkspaceMenuContributionStore';
import type { CanvasModelView } from './canvasWorkspaceMenuContributionStore';
import type { useCanvasWorkbenchFocus } from './useCanvasWorkbenchFocus';

export function useCanvasModelSelection(
  canvasId: string | null,
  nodes: readonly CanonicalNode[],
  focus: ReturnType<typeof useCanvasWorkbenchFocus>
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
  const owner = useMemo(() => ({}), [canvasId]);
  const current = useRef({ owner, modelIds });
  current.current = { owner, modelIds };
  const selected =
    selection?.owner === owner
      ? (nodes.find((node) => node.id === selection.id && modelIds.has(node.id)) ?? null)
      : null;
  const { capture, enter, restore } = focus;
  const open = useCallback(
    (nodeId: string, view?: CanvasModelView) => {
      if (current.current.owner !== owner || !current.current.modelIds.has(nodeId)) return;
      capture(undefined, nodeId);
      const select = () => {
        if (current.current.owner !== owner || !current.current.modelIds.has(nodeId)) return;
        setSelection({ owner, id: nodeId, initialView: view ?? 'semantic' });
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
    [owner, canvasId, capture, enter]
  );
  const close = useCallback(() => {
    if (current.current.owner !== owner) return;
    setSelection(null);
    restore();
  }, [owner, restore]);
  return {
    modelIds,
    selected,
    initialView: selected == null ? undefined : selection?.initialView,
    active,
    open,
    close,
    setActive,
  };
}
