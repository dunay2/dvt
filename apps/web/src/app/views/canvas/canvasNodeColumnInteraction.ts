import type { Node } from '@xyflow/react';
import type { CanonicalNode, CanonicalEdge } from '../../types/canonical';
import {
  canAuthorCanvasColumnMappings,
  readCanvasColumnMappingInputFields,
} from './canvasColumnProjectionAuthority';
import { projectCanvasColumnFunctionMenus } from './canvasColumnFunctionMenuProjection';
import { isDbtCompatibleModel } from './canvasDbtAuthoringModel';
import { isDvtSourceOutputProjectionNode } from './canvasDvtSourceSemanticAuthoring';
import type { CanvasNodePresentationTruth } from '../../components/canvas/canvasNodePresentationTruth.contract';
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
  const presentation = node.data.presentationTruth as CanvasNodePresentationTruth | undefined;
  const columnsCurrent =
    presentation?.columns.state !== 'pending' && presentation?.columns.state !== 'unavailable';
  const hasRelationOutputs =
    canonicalNode?.pluginId === 'dvt' &&
    canonicalNode.kind === 'dvt:transform' &&
    presentation?.code.kind === 'canonical' &&
    presentation.columns.state === 'ready';
  const canAuthorColumnMappings =
    columnsCurrent &&
    (canonicalNode?.role !== 'transform' || canAuthorCanvasColumnMappings(canonicalNode));
  const canAuthorDbtModelColumns =
    columnsCurrent && canonicalNode != null && isDbtCompatibleModel(canonicalNode);
  const canProjectSourceOutputs =
    columnsCurrent && canonicalNode != null && isDvtSourceOutputProjectionNode(canonicalNode);
  const hasReadOnlyColumnLineage =
    canonicalNode?.role === 'transform' &&
    !canAuthorColumnMappings &&
    readOnlyColumnLineageNodeIds.has(canonicalNode.id);
  const functionProjection =
    columnsCurrent &&
    columnFunctionNodes != null &&
    columnFunctionEdges != null &&
    canonicalNode != null
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
    columnFunctionMenus
  );
  const hasStructuredProjection =
    columnsCurrent &&
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
      hasRelationOutputs
        ? node.data.onToggleCanvasColumnOutput
        : undefined,
    onReorderCanvasColumnOutput:
      hasEditableProjection ||
      hasStructuredProjection ||
      canAuthorDbtModelColumns ||
      canProjectSourceOutputs ||
      hasRelationOutputs
        ? node.data.onReorderCanvasColumnOutput
        : undefined,
    onAutomapColumns: canAuthorColumnMappings ? node.data.onAutomapColumns : undefined,
    columns: interactiveColumns,
    columnPortDirections:
      columnsCurrent && canonicalNode != null
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
