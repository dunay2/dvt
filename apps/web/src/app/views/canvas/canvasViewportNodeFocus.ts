/** Owned concern: focus one rendered Canvas node through route-local viewport ports. */
import type { Node, NodeChange } from '@xyflow/react';

export function focusCanvasViewportNode({
  nodeId,
  nodes,
  selectNode,
  revealNode = true,
  port,
}: Readonly<{
  nodeId: string;
  nodes: readonly Node[];
  selectNode: boolean;
  revealNode?: boolean;
  port: Readonly<{
    onNodesChange: (changes: NodeChange[]) => void;
    fitView: (options: {
      nodes: Node[];
      padding: number;
      maxZoom: number;
      duration: number;
    }) => Promise<unknown>;
  }>;
}>): boolean {
  const targetNode = nodes.find((node) => node.id === nodeId);
  if (targetNode == null) {
    return false;
  }

  if (selectNode) {
    const selectionChanges: NodeChange[] = nodes
      .filter((node) => node.id !== targetNode.id && node.selected === true)
      .map((node) => ({ id: node.id, type: 'select', selected: false }));
    if (targetNode.selected !== true) {
      selectionChanges.push({ id: targetNode.id, type: 'select', selected: true });
    }
    if (selectionChanges.length > 0) {
      port.onNodesChange(selectionChanges);
    }
  }

  if (revealNode) {
    void port
      .fitView({
        nodes: [targetNode],
        padding: 0.5,
        maxZoom: 0.9,
        duration: 180,
      })
      .catch(() => undefined);
  }
  return true;
}
