import type { Node } from '@xyflow/react';
import type { CanvasInspectorNodeDraftApplyResult } from './canvasInspectorAuthoring.types';
import type {
  GraphNodeColumn,
  GraphNodeInputMapping,
  GraphNodeCalculatedColumnIdentity,
  GraphNodeColumnFunctionApplyIdentity,
  GraphNodeColumnFunctionApplyResult,
  GraphNodeColumnOutputToggleIdentity,
  GraphNodeColumnPortIdentity,
  GraphNodeColumnReorderIdentity,
  GraphNodeStructuredFieldIdentity,
} from '../../plugins/graph/graphNodeColumnContracts';
import type {
  CanvasAlgebraicCompositionIdentity,
  CanvasAlgebraicCompositionOperation,
} from './canvasAlgebraicComposition';

export type CanvasCardActions = {
  onInspectNode: (nodeId: string) => void;
  onDuplicateNode?: (nodeId: string) => void;
  onRemoveNode?: (nodeId: string) => void;
  onToggleNodeSelection?: (nodeId: string, shouldSelect: boolean) => void;
  onAttachSchemaToNode?: (nodeId: string, schemaName: string) => void;
  onSetNodeMaterialization?: (nodeId: string, value: string) => CanvasInspectorNodeDraftApplyResult;
};

export type CanvasColumnActions = {
  onColumnViewChange?: (nodeId: string, view: 'input' | 'output') => void;
  onMapCanvasInput?: (identity: GraphNodeInputMapping) => void;
  onColumnPortActivate?: (identity: GraphNodeColumnPortIdentity) => void;
  onApplyCanvasColumnFunction?: (
    identity: GraphNodeColumnFunctionApplyIdentity
  ) => GraphNodeColumnFunctionApplyResult | Promise<GraphNodeColumnFunctionApplyResult>;
  onApplyCanvasStructuredField?: (
    identity: GraphNodeStructuredFieldIdentity
  ) => GraphNodeColumnFunctionApplyResult;
  onAddCanvasCalculatedColumn?: (
    identity: GraphNodeCalculatedColumnIdentity
  ) => GraphNodeColumnFunctionApplyResult | Promise<GraphNodeColumnFunctionApplyResult>;
  onToggleCanvasColumnOutput?: (identity: GraphNodeColumnOutputToggleIdentity) => void;
  onReorderCanvasColumnOutput?: (identity: GraphNodeColumnReorderIdentity) => void;
  onColumnDisclosureChange?: (nodeId: string, expanded: boolean) => void;
  onAutomapColumns?: (nodeId: string, columns: readonly GraphNodeColumn[]) => void;
};

export type CanvasCompositionActions = {
  resolveAlgebraicCompositionOperations?: (
    identity: CanvasAlgebraicCompositionIdentity
  ) => CanvasAlgebraicCompositionOperation[];
  onComposeCanvasNodes?: (
    identity: CanvasAlgebraicCompositionIdentity & {
      operation: CanvasAlgebraicCompositionOperation;
    }
  ) => void;
};

type BuildCanvasNodeInteractionPresentationParams = {
  nodes: Node[];
  selectedNodeIds: string[];
  canMutateGraph: boolean;
  columnLevelLineageEnabled: boolean;
  handlers: CanvasCardActions & CanvasColumnActions & CanvasCompositionActions;
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
      onMapCanvasInput: handlers.onMapCanvasInput,
      onApplyCanvasColumnFunction: handlers.onApplyCanvasColumnFunction,
      onApplyCanvasStructuredField: handlers.onApplyCanvasStructuredField,
      onAddCanvasCalculatedColumn: handlers.onAddCanvasCalculatedColumn,
      onToggleCanvasColumnOutput: handlers.onToggleCanvasColumnOutput,
      onReorderCanvasColumnOutput: handlers.onReorderCanvasColumnOutput,
      onColumnDisclosureChange: handlers.onColumnDisclosureChange,
      onColumnViewChange: handlers.onColumnViewChange,
      onAutomapColumns: handlers.onAutomapColumns,
      resolveAlgebraicCompositionOperations: handlers.resolveAlgebraicCompositionOperations,
      onComposeCanvasNodes: handlers.onComposeCanvasNodes,
    },
  }));
}
