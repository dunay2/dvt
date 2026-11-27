/** Publish the scoped Model tabs and their guarded commands to the shell. */
import { useLayoutEffect } from 'react';
import type { CanonicalNode } from '../../types/canonical';
import {
  useCanvasWorkspaceMenuContributionStore,
  type CanvasModelView,
} from './canvasWorkspaceMenuContributionStore';
export function useCanvasModelTabList({
  canvasId,
  eligible,
  opened,
  open,
  close,
}: Readonly<{
  canvasId: string | null;
  eligible: ReadonlyMap<string, CanonicalNode>;
  opened: readonly Readonly<{ id: string }>[];
  open: (id: string, view?: CanvasModelView, fromTab?: boolean) => void;
  close: (id: string, visible: boolean) => void;
}>): void {
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
}
