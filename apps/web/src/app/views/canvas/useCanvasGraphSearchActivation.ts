/** Owned concern: activate one Canvas graph search result through existing UI ports. */
import type { Node, NodeChange } from '@xyflow/react';
import { useEffect, useRef } from 'react';

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

function buildSelectionChanges(nodes: readonly Node[], activeNode: Node): NodeChange[] {
  const deselectionChanges: NodeChange[] = nodes
    .filter((node) => node.id !== activeNode.id && node.selected === true)
    .map((node) => ({ id: node.id, type: 'select', selected: false }));

  if (activeNode.selected === true) {
    return deselectionChanges;
  }

  return [...deselectionChanges, { id: activeNode.id, type: 'select', selected: true }];
}

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

    const activeNode = nodes.find((node) => node.id === activeNodeId);
    if (activeNode == null) {
      return;
    }

    if (canSelectNodes && lastSelectedNodeId.current !== activeNodeId) {
      const selectionChanges = buildSelectionChanges(nodes, activeNode);
      if (selectionChanges.length > 0) {
        port.onNodesChange(selectionChanges);
      }
      lastSelectedNodeId.current = activeNodeId;
    }

    if (lastFocusedNodeId.current !== activeNodeId) {
      lastFocusedNodeId.current = activeNodeId;
      port
        .fitView({
          nodes: [activeNode],
          padding: 0.5,
          maxZoom: 0.9,
          duration: 180,
        })
        .catch(() => undefined);
    }
  }, [activeNodeId, canSelectNodes, nodes, port]);
}
