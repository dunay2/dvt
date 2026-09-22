/** Scope transient output inspection to the current Canvas and own return focus. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CanonicalNode } from '../../types/canonical';
import type { GraphNodeColumnInspect } from '../../plugins/graph/graphNodeColumnContracts';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import type { CanvasShellContextualWorkbench } from './canvasShell.types';
import { projectCanvasOutputExpression } from './canvasOutputExpressionProjection';
import { SemanticOutputExpressionPanel } from './SemanticOutputExpressionPanel';
import { findCanvasGraphNodeElement } from './canvasNodeWorkbenchDomGeometry';

export function useCanvasOutputExpressionInspection(
  canvasId: string | null,
  nodes: readonly CanonicalNode[]
) {
  const language = useApplicationLanguageStore((state) => state.language);
  const [selection, setSelection] = useState<{
    canvasId: string;
    nodeId: string;
    fieldId: string;
  } | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const pendingFocus = useRef<number | null>(null);
  const node =
    selection?.canvasId === canvasId
      ? nodes.find(
          (candidate) =>
            candidate.id === selection?.nodeId &&
            candidate.kind === 'dvt:transform' &&
            candidate.pluginId === 'dvt'
        )
      : undefined;
  const cancelFocus = useCallback(() => {
    if (pendingFocus.current != null) cancelAnimationFrame(pendingFocus.current);
    pendingFocus.current = null;
  }, []);
  useEffect(() => cancelFocus, [cancelFocus]);
  useEffect(() => {
    if (node != null || selection == null) return;
    setSelection(null);
    opener.current = null;
    cancelFocus();
  }, [canvasId, node, selection, cancelFocus]);
  const open = useCallback<GraphNodeColumnInspect>(
    (request) => {
      if (
        canvasId == null ||
        !nodes.some(
          (candidate) =>
            candidate.id === request.nodeId &&
            candidate.kind === 'dvt:transform' &&
            candidate.pluginId === 'dvt'
        )
      )
        return;
      cancelFocus();
      opener.current = request.anchorElement;
      setSelection({ canvasId, nodeId: request.nodeId, fieldId: request.fieldId });
    },
    [canvasId, nodes, cancelFocus]
  );
  const close = useCallback(async () => {
    const element = opener.current;
    const identity = selection;
    const activeElement = document.activeElement;
    cancelFocus();
    setSelection(null);
    opener.current = null;
    pendingFocus.current = requestAnimationFrame(() => {
      pendingFocus.current = null;
      if (document.activeElement !== document.body && document.activeElement !== activeElement)
        return;
      const replacement = findCanvasGraphNodeElement(
        identity?.nodeId ?? null
      )?.querySelectorAll<HTMLElement>('[data-slot="graph-node-column-piece"]');
      const target = element?.isConnected
        ? element
        : Array.from(replacement ?? []).find(
            (piece) => piece.dataset.fieldId === identity?.fieldId
          );
      target?.focus({ preventScroll: true });
    });
    return true;
  }, [cancelFocus, selection]);
  const workbench = useMemo<CanvasShellContextualWorkbench | undefined>(() => {
    if (node == null || selection == null) return undefined;
    const projection = projectCanvasOutputExpression(node, selection.fieldId);
    const title = language === 'es' ? 'Propiedades' : 'Properties';
    return {
      id: 'output-expression',
      presentation: 'docked',
      title: `${title} · ${projection.status === 'available' ? projection.alias : node.name}`,
      closeLabel: language === 'es' ? 'Cerrar expresión' : 'Close expression',
      requestClose: close,
      panel: (
        <SemanticOutputExpressionPanel
          key={`${selection.nodeId}:${selection.fieldId}:${projection.status === 'available' ? projection.semanticDigest : projection.reason}`}
          projection={projection}
          fieldId={selection.fieldId}
        />
      ),
    };
  }, [node, selection, language, close]);
  return { open, workbench };
}
