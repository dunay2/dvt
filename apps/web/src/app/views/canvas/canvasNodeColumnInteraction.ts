import type { Node } from '@xyflow/react';
import type { CanonicalNode, CanonicalEdge } from '../../types/canonical';
import {
  canAuthorCanvasColumnMappings,
  readCanvasColumnMappingInputFields,
} from './canvasColumnProjectionAuthority';
import { projectCanvasColumnFunctionMenus } from './canvasColumnFunctionMenuProjection';
import { isDbtCompatibleModel } from './canvasDbtAuthoringModel';
import { isDvtSourceOutputProjectionNode } from './canvasDvtSourceSemanticAuthoring';
import { readCanvasJoinColumnOutputs } from './canvasJoinColumnOutputModel';
import { projectInteractiveCanvasColumns } from './canvasGraphNodeColumnProjection';
import { resolveCanvasColumnPortDirections } from './canvasColumnLineageProjection';

type ColumnInteractionContext = {
  canonicalNodesById: ReadonlyMap<string, CanonicalNode>;
  columnFunctionNodes: CanonicalNode[] | undefined;
  columnFunctionEdges: readonly Pick<CanonicalEdge, 'sourceId' | 'targetId'>[] | undefined;
  readOnlyColumnLineageNodeIds: ReadonlySet<string>;
};
export function projectCanvasNodeColumnInteraction(
  node: Node,
  {
    canonicalNodesById,
    columnFunctionNodes,
    columnFunctionEdges,
    readOnlyColumnLineageNodeIds,
  }: ColumnInteractionContext
): Node {
  const canonicalNode = canonicalNodesById.get(node.id);
  const joinOutputs = canonicalNode == null ? null : readCanvasJoinColumnOutputs(canonicalNode);
  const canAuthorColumnMappings =
    canonicalNode?.role !== 'transform' || canAuthorCanvasColumnMappings(canonicalNode);
  const canAuthorDbtModelColumns = canonicalNode != null && isDbtCompatibleModel(canonicalNode);
  const canProjectSourceOutputs =
    canonicalNode != null && isDvtSourceOutputProjectionNode(canonicalNode);
  const hasReadOnlyColumnLineage =
    canonicalNode?.role === 'transform' &&
    !canAuthorColumnMappings &&
    readOnlyColumnLineageNodeIds.has(canonicalNode.id);
  const functionProjection =
    columnFunctionNodes != null && columnFunctionEdges != null && canonicalNode != null
      ? projectCanvasColumnFunctionMenus({
          node: canonicalNode,
          nodes: columnFunctionNodes,
          edges: columnFunctionEdges,
        })
      : { hasEditableProjection: false, supportsCalculatedColumns: false };
  const columnFunctionMenus = functionProjection.menus;
  const interactiveColumns = projectInteractiveCanvasColumns(
    node,
    canonicalNodesById,
    columnFunctionMenus,
    joinOutputs?.fields.map((field) => ({
      id: field.columnId,
      name: field.name,
      type: field.dataType,
      output: field.selected,
      reference: field.columnId,
      sourceReference: field.sourceReference,
    }))
  );
  const hasStructuredProjection =
    canonicalNode?.pluginId === 'dvt' &&
    canonicalNode.kind === 'dvt:transform' &&
    interactiveColumns.some((column) => column.children?.length);
  const hasEditableProjection = functionProjection.hasEditableProjection;
  const hasMaterializableMappingInput =
    canAuthorColumnMappings &&
    !hasEditableProjection &&
    canonicalNode != null &&
    columnFunctionEdges != null &&
    columnFunctionEdges.some((edge) => {
      if (edge.targetId !== canonicalNode.id) return false;
      const sourceNode = canonicalNodesById.get(edge.sourceId);
      return (
        sourceNode != null &&
        readCanvasColumnMappingInputFields({
          sourceNode,
          edges: columnFunctionEdges,
          resolveNode: (nodeId) => canonicalNodesById.get(nodeId),
        }).length > 0
      );
    });
  const canApplyStructuredField = hasEditableProjection || hasStructuredProjection;

  const projectedNodeData = {
    ...node.data,
    onColumnPortActivate: canAuthorColumnMappings ? node.data.onColumnPortActivate : undefined,
    onApplyCanvasColumnFunction: hasEditableProjection
      ? node.data.onApplyCanvasColumnFunction
      : undefined,
    resolveCanvasColumnCompositionFunctions: hasEditableProjection
      ? functionProjection.resolveCompositionFunctions
      : undefined,
    onApplyCanvasStructuredField: canApplyStructuredField
      ? node.data.onApplyCanvasStructuredField
      : undefined,
    onAddCanvasCalculatedColumn: functionProjection.supportsCalculatedColumns
      ? node.data.onAddCanvasCalculatedColumn
      : undefined,
    expressionInputColumns: functionProjection.expressionInputs,
    onToggleCanvasColumnOutput:
      (canAuthorColumnMappings && (hasEditableProjection || hasMaterializableMappingInput)) ||
      hasStructuredProjection ||
      canAuthorDbtModelColumns ||
      canProjectSourceOutputs ||
      joinOutputs != null
        ? node.data.onToggleCanvasColumnOutput
        : undefined,
    onReorderCanvasColumnOutput:
      hasEditableProjection ||
      hasStructuredProjection ||
      canAuthorDbtModelColumns ||
      canProjectSourceOutputs ||
      joinOutputs != null
        ? node.data.onReorderCanvasColumnOutput
        : undefined,
    onAutomapColumns: canAuthorColumnMappings ? node.data.onAutomapColumns : undefined,
    columns: interactiveColumns,
    columnPortDirections:
      canonicalNode != null
        ? canonicalNode.role === 'transform' &&
          !canAuthorColumnMappings &&
          !hasReadOnlyColumnLineage &&
          !canAuthorDbtModelColumns
          ? []
          : resolveCanvasColumnPortDirections(canonicalNode.role)
        : [],
  };
  return { ...node, data: projectedNodeData };
}
