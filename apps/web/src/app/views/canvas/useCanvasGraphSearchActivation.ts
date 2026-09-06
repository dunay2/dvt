/** Owned concern: activate one Canvas graph search result through existing UI ports. */
import type { Node, NodeChange } from '@xyflow/react';
import { useEffect, useRef } from 'react';

import { focusCanvasViewportNode } from './canvasViewportNodeFocus';

export type CanvasGraphSearchActivationPort = Readonly<{
  onNodesChange: (changes: NodeChange[]) => void;
  fitView: (options: {
    nodes: Node[];
    padding: number;
    maxZoom: number;
    duration: number;
  }) => Promise<unknown>;
}>;

export type UseCanvasGraphSearchActivationArgs = Readonly<{
  activeNodeId: string | null;
  nodes: Node[];
  canSelectNodes: boolean;
  port: CanvasGraphSearchActivationPort;
}>;

export function useCanvasGraphSearchActivation({
  activeNodeId,
  nodes,
  canSelectNodes,
  port,
}: UseCanvasGraphSearchActivationArgs): void {
  const lastFocusedNodeId = useRef<string | null>(null);
  const lastSelectedNodeId = useRef<string | null>(null);

  useEffect(() => {
    if (activeNodeId == null) {
      lastFocusedNodeId.current = null;
      lastSelectedNodeId.current = null;
      return;
    }

    const shouldSelect = canSelectNodes && lastSelectedNodeId.current !== activeNodeId;
    const shouldReveal = lastFocusedNodeId.current !== activeNodeId;
    if (!shouldSelect && !shouldReveal) {
      return;
    }

    const focused = focusCanvasViewportNode({
      nodeId: activeNodeId,
      nodes,
      selectNode: shouldSelect,
      revealNode: shouldReveal,
      port,
    });
    if (!focused) {
      return;
    }

    if (shouldSelect) {
      lastSelectedNodeId.current = activeNodeId;
    }
    if (shouldReveal) {
      lastFocusedNodeId.current = activeNodeId;
    }
  }, [activeNodeId, canSelectNodes, nodes, port]);
}
