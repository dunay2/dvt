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
import {
  projectInteractiveCanvasColumns,
  projectGraphNodeCardInputs,
} from './canvasGraphNodeColumnProjection';
import { resolveCanvasColumnPortDirections } from './canvasColumnHandleIdentity';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';

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
  if (
    canonicalNode?.pluginId === 'dvt' &&
    canonicalNode.kind === 'dvt:transform' &&
    !isDbtCompatibleModel(canonicalNode)
  ) {
    let inputsCurrent = columnsCurrent;
    try {
      readDvtTransformAuthoringAuthority(canonicalNode);
    } catch {
      inputsCurrent = false;
    }
    return {
      ...node,
      data: {
        ...node.data,
        columns: projectInteractiveCanvasColumns(node, canonicalNodesById),
        inputColumns: presentation == null ? [] : projectGraphNodeCardInputs(presentation, node.id),
        columnPortDirections: inputsCurrent ? ['target', 'source'] : [],
        expressionInputColumns: [],
        onMapCanvasInput: inputsCurrent ? node.data.onMapCanvasInput : undefined,
        onColumnPortActivate: inputsCurrent ? node.data.onColumnPortActivate : undefined,
        onAutomapColumns: undefined,
        onApplyCanvasColumnFunction: undefined,
        onApplyCanvasStructuredField: undefined,
        onAddCanvasCalculatedColumn: undefined,
        onToggleCanvasColumnOutput: undefined,
        onReorderCanvasColumnOutput: undefined,
        resolveCanvasColumnCompositionFunctions: undefined,
      },
    };
  }
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

  const projectedNodeData = {
    ...node.data,
    onColumnPortActivate: canAuthorColumnMappings ? node.data.onColumnPortActivate : undefined,
    onMapCanvasInput: undefined,
    onApplyCanvasColumnFunction: hasEditableProjection
      ? node.data.onApplyCanvasColumnFunction
      : undefined,
    resolveCanvasColumnCompositionFunctions: hasEditableProjection
      ? functionProjection.resolveCompositionFunctions
      : undefined,
    onApplyCanvasStructuredField: hasEditableProjection
      ? node.data.onApplyCanvasStructuredField
      : undefined,
    onAddCanvasCalculatedColumn: functionProjection.supportsCalculatedColumns
      ? node.data.onAddCanvasCalculatedColumn
      : undefined,
    expressionInputColumns: functionProjection.expressionInputs,
    onToggleCanvasColumnOutput:
      (canAuthorColumnMappings && (hasEditableProjection || hasMaterializableMappingInput)) ||
      canAuthorDbtModelColumns ||
      canProjectSourceOutputs
        ? node.data.onToggleCanvasColumnOutput
        : undefined,
    onReorderCanvasColumnOutput:
      hasEditableProjection || canAuthorDbtModelColumns || canProjectSourceOutputs
        ? node.data.onReorderCanvasColumnOutput
        : undefined,
    onAutomapColumns: canAuthorColumnMappings ? node.data.onAutomapColumns : undefined,
    columns: interactiveColumns,
    inputColumns: undefined,
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
