import type { Node } from '@xyflow/react';

type NodeActionHandlers = {
  onInspectNode: (nodeId: string) => void;
  onDuplicateNode?: (nodeId: string) => void;
  onRemoveNode?: (nodeId: string) => void;
  onToggleNodeSelection?: (nodeId: string, shouldSelect: boolean) => void;
  onAttachSchemaToNode?: (nodeId: string, schemaName: string) => void;
};

type BuildCanvasNodeInteractionPresentationParams = {
  nodes: Node[];
  selectedNodeIds: string[];
  canMutateGraph: boolean;
  columnLevelLineageEnabled: boolean;
  handlers: NodeActionHandlers;
};

function shouldShowColumns(node: Node, columnLevelLineageEnabled: boolean): boolean {
  return columnLevelLineageEnabled || node.data?.showColumns === true;
}

export function buildCanvasNodeInteractionPresentation({
  nodes,
  selectedNodeIds,
  canMutateGraph,
  columnLevelLineageEnabled,
  handlers,
}: BuildCanvasNodeInteractionPresentationParams): Node[] {
  const selectedNodeIdSet = new Set(selectedNodeIds);

  return nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      selectedForExecution: selectedNodeIdSet.has(node.id),
      canMutateGraph,
      showColumns: shouldShowColumns(node, columnLevelLineageEnabled),
      onInspectNode: handlers.onInspectNode,
      onDuplicateNode: handlers.onDuplicateNode,
      onRemoveNode: handlers.onRemoveNode,
      onToggleNodeSelection: handlers.onToggleNodeSelection,
      onAttachSchemaToNode: handlers.onAttachSchemaToNode,
    },
  }));
}
