/**
 * Owned concern: reveal project browsing and delegate selection to existing scoped navigation.
 * @baseline ADR-0069: view intent is presentation state, never a Model aggregate or write command.
 * @decision Register scoped rail callbacks and reuse guarded Model replacement and inspection.
 * @consequence View shortcuts reuse the current selection and never author graph state.
 * @version 1.1.0
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useUiLayoutStore } from '../../stores/uiLayoutStore';
import type {
  CanvasInspectorCommand,
  CanvasInspectorRequest,
  CanvasInspectorResource,
} from '../../stores/canvasInspectorTarget';
import {
  useCanvasWorkspaceMenuContributionStore,
  type CanvasModelView,
} from './canvasWorkspaceMenuContributionStore';
import type { useCanvasModelSelection } from './useCanvasModelSelection';
import type { CanonicalNode } from '../../types/canonical';
import {
  resolveCanvasModelNavigationTarget,
  type CanvasModelNavigationContext,
} from './canvasModelNavigationTarget';

export function useCanvasModelBrowser({
  canvasId,
  nodes,
  model,
  inspectorTarget,
  showCanvas,
  onInspect,
}: Readonly<{
  canvasId: string | null;
  nodes: readonly CanonicalNode[];
  model: ReturnType<typeof useCanvasModelSelection>;
  inspectorTarget?: CanvasInspectorResource | null;
  showCanvas: () => void;
  onInspect: CanvasInspectorCommand;
}>) {
  const [choice, setChoice] = useState<Readonly<{ owner: object; mode: CanvasModelView }> | null>(
    null
  );
  const owner = useMemo(() => ({}), [canvasId]);
  const [pendingContext, setPendingContext] = useState<Readonly<{
    owner: object;
    view: CanvasModelView;
    contexts: readonly CanvasModelNavigationContext[];
  }> | null>(null);
  const currentOwner = useRef(owner);
  currentOwner.current = owner;
  const mode = choice?.owner === owner ? choice.mode : null;
  const onCanvas = useCallback(() => {
    if (currentOwner.current !== owner) return;
    setChoice(null);
    setPendingContext(null);
    showCanvas();
    model.setActive(false);
  }, [owner, showCanvas, model.setActive]);
  const onSelect = useCallback(
    (
      request: CanvasInspectorRequest,
      preferredTab?: string | null,
      requestedView?: CanvasModelView
    ) => {
      if (currentOwner.current !== owner) return false;
      const tab = useCanvasWorkspaceMenuContributionStore.getState().modelTab;
      const view =
        requestedView ??
        (mode != null && model.active && tab?.canvasId === canvasId
          ? (tab.views?.active ?? mode)
          : mode);
      const nodeId =
        typeof request === 'string'
          ? request
          : request.kind === 'canonical-node'
            ? request.nodeId
            : null;
      if (view != null && nodeId != null && model.modelIds.has(nodeId)) {
        showCanvas();
        const target = resolveCanvasModelNavigationTarget(nodeId, nodes, model.selected?.id);
        if (target.kind === 'contexts')
          setPendingContext({ owner, view, contexts: target.contexts });
        else model.open(target.nodeId, view);
        return true;
      }
      showCanvas();
      model.setActive(false);
      return onInspect(request, preferredTab ?? (view === 'sql' ? 'code' : null));
    },
    [
      owner,
      canvasId,
      mode,
      model.active,
      nodes,
      model.modelIds,
      model.selected?.id,
      model.open,
      model.setActive,
      showCanvas,
      onInspect,
    ]
  );
  const onBrowse = useCallback(
    (view: CanvasModelView) => {
      if (canvasId == null || currentOwner.current !== owner) return;
      const tab = useCanvasWorkspaceMenuContributionStore.getState().modelTab;
      const currentTab = tab?.canvasId === canvasId ? tab : null;
      if (currentTab?.views?.disabled) return;

      setChoice({ owner, mode: view });
      setPendingContext(null);
      useUiLayoutStore.getState().dispatchCanvasExplorer({ type: 'expand' });
      const selectedId = model.selected?.id;
      const request =
        currentTab?.active && currentTab.nodeId === selectedId
          ? selectedId
          : (inspectorTarget ?? selectedId);
      if (request != null) {
        void onSelect(request, null, view);
      } else {
        showCanvas();
        model.setActive(false);
      }
    },
    [canvasId, owner, inspectorTarget, model.selected?.id, onSelect, showCanvas, model.setActive]
  );
  useEffect(() => {
    if (canvasId == null) return;
    const browser = { canvasId, mode, onBrowse, onCanvas };
    const store = useCanvasWorkspaceMenuContributionStore.getState();
    store.registerModelBrowser(browser);
    return () => store.clearModelBrowser(browser);
  }, [canvasId, mode, onBrowse, onCanvas]);
  const contexts =
    pendingContext?.owner === owner
      ? pendingContext.contexts.filter((item) => model.modelIds.has(item.nodeId))
      : [];
  const selectContext = (nodeId: string): void => {
    if (
      currentOwner.current !== owner ||
      pendingContext?.owner !== owner ||
      !contexts.some((item) => item.nodeId === nodeId)
    )
      return;
    setPendingContext(null);
    model.open(nodeId, pendingContext.view);
  };
  return {
    mode,
    onSelect,
    contexts,
    selectContext,
    cancelContext: () => {
      if (currentOwner.current === owner) setPendingContext(null);
    },
  };
}
