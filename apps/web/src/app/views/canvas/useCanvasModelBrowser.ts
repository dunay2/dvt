/**
 * Owned concern: reveal project browsing and delegate selection to existing scoped navigation.
 * @baseline ADR-0069: view intent is presentation state, never a Model aggregate or write command.
 * @decision Register scoped rail callbacks and reuse guarded Model replacement and inspection.
 * @consequence Choosing a view cannot choose a Model, create an occurrence or execute SQL.
 * @version 1.0.0
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useUiLayoutStore } from '../../stores/uiLayoutStore';
import type { CanvasInspectorCommand } from '../../stores/canvasInspectorTarget';
import {
  useCanvasWorkspaceMenuContributionStore,
  type CanvasModelView,
} from './canvasWorkspaceMenuContributionStore';
import type { useCanvasModelSelection } from './useCanvasModelSelection';

export function useCanvasModelBrowser({
  canvasId,
  model,
  showCanvas,
  onInspect,
}: Readonly<{
  canvasId: string | null;
  model: ReturnType<typeof useCanvasModelSelection>;
  showCanvas: () => void;
  onInspect: CanvasInspectorCommand;
}>) {
  const [choice, setChoice] = useState<Readonly<{ owner: object; mode: CanvasModelView }> | null>(
    null
  );
  const owner = useMemo(() => ({}), [canvasId]);
  const currentOwner = useRef(owner);
  currentOwner.current = owner;
  const mode = choice?.owner === owner ? choice.mode : null;
  const onCanvas = useCallback(() => {
    if (currentOwner.current !== owner) return;
    setChoice(null);
    showCanvas();
    model.setActive(false);
  }, [owner, showCanvas, model.setActive]);
  const onBrowse = useCallback(
    (view: CanvasModelView) => {
      if (canvasId == null || currentOwner.current !== owner) return;
      setChoice({ owner, mode: view });
      showCanvas();
      model.setActive(false);
      useUiLayoutStore.getState().dispatchCanvasExplorer({ type: 'expand' });
    },
    [canvasId, owner, showCanvas, model.setActive]
  );
  useEffect(() => {
    if (canvasId == null) return;
    const browser = { canvasId, mode, onBrowse, onCanvas };
    const store = useCanvasWorkspaceMenuContributionStore.getState();
    store.registerModelBrowser(browser);
    return () => store.clearModelBrowser(browser);
  }, [canvasId, mode, onBrowse, onCanvas]);
  const onSelect: CanvasInspectorCommand = useCallback(
    (request, preferredTab) => {
      if (currentOwner.current !== owner) return false;
      const nodeId =
        typeof request === 'string'
          ? request
          : request.kind === 'canonical-node'
            ? request.nodeId
            : null;
      if (mode != null && nodeId != null && model.modelIds.has(nodeId)) {
        showCanvas();
        model.open(nodeId, mode);
        return true;
      }
      showCanvas();
      model.setActive(false);
      return onInspect(request, preferredTab ?? (mode === 'sql' ? 'code' : null));
    },
    [owner, mode, model.modelIds, model.open, model.setActive, showCanvas, onInspect]
  );
  return { mode, onSelect };
}
