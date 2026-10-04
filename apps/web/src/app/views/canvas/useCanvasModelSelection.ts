/** Own Model tab selection and delegate protected replacement to the current editor. */
import { useCallback, useMemo, useState } from 'react';
import type { CanonicalNode } from '../../types/canonical';
import { canOpenCanvasRelationalTreeWorkbench } from './useCanvasRelationalTreeWorkbenchModel';
import { useCanvasWorkspaceMenuContributionStore } from './canvasWorkspaceMenuContributionStore';
import type { useCanvasWorkbenchFocus } from './useCanvasWorkbenchFocus';

export function useCanvasModelSelection(
  canvasId: string | null,
  nodes: readonly CanonicalNode[],
  focus: ReturnType<typeof useCanvasWorkbenchFocus>
) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [active, setActive] = useState(true);
  const modelIds = useMemo(
    () => new Set(nodes.filter(canOpenCanvasRelationalTreeWorkbench).map((node) => node.id)),
    [nodes]
  );
  const selected = nodes.find((node) => node.id === selectedId && modelIds.has(node.id)) ?? null;
  const { capture, enter, restore } = focus;
  const open = useCallback(
    (nodeId: string) => {
      if (!modelIds.has(nodeId)) return;
      capture(undefined, nodeId);
      const select = () => {
        setSelectedId(nodeId);
        setActive(true);
        enter('[data-slot="canvas-model-editor"]');
      };
      const current = useCanvasWorkspaceMenuContributionStore.getState().modelTab;
      if (current?.canvasId === canvasId && current.nodeId !== nodeId) current.onClose(select);
      else select();
    },
    [modelIds, canvasId, capture, enter]
  );
  const close = useCallback(() => {
    setSelectedId(null);
    restore();
  }, [restore]);
  return { modelIds, selected, active, open, close, setActive };
}
