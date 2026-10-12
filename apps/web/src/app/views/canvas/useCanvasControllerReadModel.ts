import { useMemo } from 'react';
import { validateTransformationGraph } from './transformationGraphValidation';
import type { CanvasControllerReadModelArgs } from './canvasControllerReadModel.contract';
import { useCanvasColumnLineageModel } from './useCanvasColumnLineageModel';
import { useCanvasNodeInteractionModel } from './useCanvasNodeInteractionModel';
import { useCanvasSemanticNodeInputs, useCanvasNodeGeometry } from './useCanvasSemanticNodeInputs';

export function useCanvasControllerReadModel(args: CanvasControllerReadModelArgs) {
  const { graphModel, visibleScope, executionScope, uiScope } = args;
  const transformationValidation = useMemo(
    () =>
      validateTransformationGraph({
        nodes: visibleScope.canonicalNodes,
        edges: visibleScope.canonicalEdges,
        selectedNodeIds: executionScope.selectedNodeIds,
        workspaceNodeIds: executionScope.workspaceNodeIds,
      }),
    [
      executionScope.selectedNodeIds,
      executionScope.workspaceNodeIds,
      visibleScope.canonicalEdges,
      visibleScope.canonicalNodes,
    ]
  );
  const semanticGraphNodes = useCanvasSemanticNodeInputs(graphModel.nodes);
  const lineage = useCanvasColumnLineageModel({
    semanticGraphNodes,
    visibleScope,
    edges: graphModel.edges,
    onEdgesChange: graphModel.onEdgesChange,
    onRemoveColumnMapping: args.canMutateGraph ? args.onRemoveColumnMapping : undefined,
  });
  const semanticNodes = useCanvasNodeInteractionModel({
    ...args,
    semanticGraphNodes,
    readOnlyColumnLineageNodeIds: lineage.readOnlyColumnLineageNodeIds,
  });
  const nodesWithImpact = useCanvasNodeGeometry(graphModel.nodes, semanticNodes);
  const inspectorNode = uiScope.inspectorNodeId
    ? (graphModel.canonicalNodesById.get(uiScope.inspectorNodeId) ?? null)
    : null;
  return {
    transformationValidation,
    nodesWithImpact,
    inspectorNode,
    edgesWithImpact: lineage.edgesWithImpact,
    handleEdgesChange: lineage.handleEdgesChange,
  };
}
