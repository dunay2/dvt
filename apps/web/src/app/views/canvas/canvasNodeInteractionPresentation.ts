import type { Node } from '@xyflow/react';
import type {
  GraphNodeColumn,
  GraphNodeColumnPortIdentity,
  GraphNodeColumnReorderIdentity,
} from '../../plugins/graph/GraphNodeColumnSection';

type NodeActionHandlers = {
  onInspectNode: (nodeId: string) => void;
  onDuplicateNode?: (nodeId: string) => void;
  onRemoveNode?: (nodeId: string) => void;
  onToggleNodeSelection?: (nodeId: string, shouldSelect: boolean) => void;
  onAttachSchemaToNode?: (nodeId: string, schemaName: string) => void;
  onColumnPortActivate?: (identity: GraphNodeColumnPortIdentity) => void;
  onApplyDvtSubstraitColumnFunction?: (identity: {
    nodeId: string;
    columnId: string;
    capabilityId: string;
  }) => void;
  onToggleDvtSubstraitColumnOutput?: (identity: {
    nodeId: string;
    columnId: string;
    columnType: string;
    output: boolean;
  }) => void;
  onReorderDvtSubstraitColumnOutput?: (identity: GraphNodeColumnReorderIdentity) => void;
  onColumnDisclosureChange?: (nodeId: string, expanded: boolean) => void;
  onAutomapColumns?: (nodeId: string, columns: readonly GraphNodeColumn[]) => void;
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
      onColumnPortActivate: handlers.onColumnPortActivate,
      onApplyDvtSubstraitColumnFunction: handlers.onApplyDvtSubstraitColumnFunction,
      onToggleDvtSubstraitColumnOutput: handlers.onToggleDvtSubstraitColumnOutput,
      onReorderDvtSubstraitColumnOutput: handlers.onReorderDvtSubstraitColumnOutput,
      onColumnDisclosureChange: handlers.onColumnDisclosureChange,
      onAutomapColumns: handlers.onAutomapColumns,
    },
  }));
}
