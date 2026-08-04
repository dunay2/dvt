/** Owned concern: apply imperative React Flow viewport effects for the Canvas viewport. */
import type { Node } from '@xyflow/react';
import { useEffect, type CSSProperties, type RefObject } from 'react';

import { applyCanvasViewportStyle } from './canvasViewportStyle';

type CanvasViewportPosition = Readonly<{ x: number; y: number; zoom: number }>;

type CanvasViewportReactFlowApi = Readonly<{
  setViewport: (
    viewport: CanvasViewportPosition,
    options: Readonly<{ duration: number }>
  ) => Promise<unknown>;
  fitView: (
    options: Readonly<{
      nodes: Node[];
      padding: number;
      maxZoom: number;
      duration: number;
    }>
  ) => Promise<unknown>;
}>;

type CanvasViewportLifecycleArgs = Readonly<{
  viewportRef: RefObject<HTMLDivElement>;
  canvasStyle: CSSProperties;
  viewport: CanvasViewportPosition | null;
  importedNodeFocusIds: readonly string[];
  nodesWithImpact: Node[];
  onImportedNodeFocusComplete: () => void;
  reactFlow: CanvasViewportReactFlowApi;
}>;

export function useCanvasViewportLifecycle({
  viewportRef,
  canvasStyle,
  viewport,
  importedNodeFocusIds,
  nodesWithImpact,
  onImportedNodeFocusComplete,
  reactFlow,
}: CanvasViewportLifecycleArgs): void {
  useEffect(() => {
    if (viewportRef.current == null) {
      return;
    }

    applyCanvasViewportStyle(viewportRef.current, canvasStyle);
  }, [canvasStyle, viewportRef]);

  useEffect(() => {
    if (viewport == null) {
      return;
    }

    reactFlow.setViewport(viewport, { duration: 0 }).catch(() => undefined);
  }, [reactFlow, viewport]);

  useEffect(() => {
    if (importedNodeFocusIds.length === 0) {
      return;
    }

    const importedNodeIdSet = new Set(importedNodeFocusIds);
    const focusNodes = nodesWithImpact.filter((node) => importedNodeIdSet.has(node.id));
    if (focusNodes.length === 0) {
      return;
    }

    reactFlow
      .fitView({
        nodes: focusNodes,
        padding: 0.24,
        maxZoom: 0.9,
        duration: 300,
      })
      .catch(() => undefined);
    onImportedNodeFocusComplete();
  }, [importedNodeFocusIds, nodesWithImpact, onImportedNodeFocusComplete, reactFlow]);
}

export type { CanvasViewportPosition, CanvasViewportReactFlowApi };
