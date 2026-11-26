import type { CanvasControllerReadModelArgs } from './canvasControllerReadModel.contract';
import { useCanvasColumnLineageModel } from './useCanvasColumnLineageModel';
import { useCanvasNodeInteractionModel } from './useCanvasNodeInteractionModel';
import { useCanvasSemanticNodeInputs, useCanvasNodeGeometry } from './useCanvasSemanticNodeInputs';
import { useCanvasZoomColumnDisclosure } from './useCanvasZoomColumnDisclosure';

export function useCanvasControllerReadModel(args: CanvasControllerReadModelArgs) {
  const { graphModel, visibleScope, uiScope } = args;
  const zoomDisclosure = useCanvasZoomColumnDisclosure(
    useCanvasSemanticNodeInputs(graphModel.nodes),
    args.atMaximumZoom ?? false,
    args.columnActions.onColumnDisclosureChange,
    args.zoomDisclosureScopeKey
  );
  const semanticGraphNodes = zoomDisclosure.nodes;
  const lineage = useCanvasColumnLineageModel({
    semanticGraphNodes,
    visibleScope,
    edges: graphModel.edges,
    onEdgesChange: graphModel.onEdgesChange,
    onRemoveColumnMapping: args.canMutateGraph ? args.onRemoveColumnMapping : undefined,
  });
  const semanticNodes = useCanvasNodeInteractionModel({
    ...args,
    columnActions: {
      ...args.columnActions,
      onColumnDisclosureChange: zoomDisclosure.onColumnDisclosureChange,
    },
    semanticGraphNodes,
    readOnlyColumnLineageNodeIds: lineage.readOnlyColumnLineageNodeIds,
  });
  const nodesWithImpact = useCanvasNodeGeometry(graphModel.nodes, semanticNodes);
  const inspectorNode = uiScope.inspectorNodeId
    ? (graphModel.canonicalNodesById.get(uiScope.inspectorNodeId) ?? null)
    : null;
  return {
    nodesWithImpact,
    inspectorNode,
    edgesWithImpact: lineage.edgesWithImpact,
    handleEdgesChange: lineage.handleEdgesChange,
  };
}
