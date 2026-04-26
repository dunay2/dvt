import { useMemo } from 'react';
import type { Edge, Node } from '@xyflow/react';

import { buildNodesWithImpact } from './canvasImpactOverlay';
import { validateTransformationGraph } from './transformationGraphValidation';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { UseCanvasGraphHandlersResult } from './useCanvasGraphHandlers.types';

type UseCanvasControllerReadModelArgs = {
  graphModel: {
    nodes: Node[];
    edges: Edge[];
    canonicalNodesById: Map<string, CanonicalNode>;
  };
  visibleScope: {
    canonicalNodes: CanonicalNode[];
    canonicalEdges: CanonicalEdge[];
  };
  executionScope: {
    selectedNodeIds: string[];
    workspaceNodeIds: string[];
  };
  uiScope: {
    selectedNodeIds: string[];
    inspectorNodeId: string | null;
  };
  overlayModel: {
    activeRunId: string | null;
    overlayDecorations: ReadonlyMap<string, unknown>;
    runStatusByNodeId: ReadonlyMap<string, string>;
  };
  graphHandlers: Pick<
    UseCanvasGraphHandlersResult,
    'handleInspectNode' | 'handleDuplicateNode' | 'handleRemoveNode' | 'handleToggleNodeSelection'
  >;
  canMutateGraph: boolean;
  columnLevelLineageEnabled: boolean;
  impactOverlayEnabled: boolean;
};

type CanvasNodeActionHandlers = Parameters<typeof buildNodesWithImpact>[0]['handlers'];

function useCanvasTransformationValidation({
  visibleScope,
  executionScope,
}: Pick<UseCanvasControllerReadModelArgs, 'visibleScope' | 'executionScope'>) {
  return useMemo(
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
}

function useCanvasNodeActionHandlers({
  graphHandlers,
  canMutateGraph,
}: Pick<UseCanvasControllerReadModelArgs, 'graphHandlers' | 'canMutateGraph'>) {
  return useMemo<CanvasNodeActionHandlers>(
    () => ({
      onInspectNode: graphHandlers.handleInspectNode,
      onDuplicateNode: canMutateGraph ? graphHandlers.handleDuplicateNode : undefined,
      onRemoveNode: canMutateGraph ? graphHandlers.handleRemoveNode : undefined,
      onToggleNodeSelection: graphHandlers.handleToggleNodeSelection,
    }),
    [
      canMutateGraph,
      graphHandlers.handleInspectNode,
      graphHandlers.handleDuplicateNode,
      graphHandlers.handleRemoveNode,
      graphHandlers.handleToggleNodeSelection,
    ]
  );
}

function applyCanvasOverlayModel(args: {
  nodes: Node[];
  activeRunId: string | null;
  overlayDecorations: ReadonlyMap<string, unknown>;
  runStatusByNodeId: ReadonlyMap<string, string>;
}): Node[] {
  const { nodes, activeRunId, overlayDecorations, runStatusByNodeId } = args;

  return nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      activeRunId,
      runStatusByNodeId,
      overlayDecoration: overlayDecorations.get(node.id) ?? null,
    },
  }));
}

function useCanvasNodesWithImpact({
  graphModel,
  uiScope,
  overlayModel,
  canMutateGraph,
  graphHandlers,
  columnLevelLineageEnabled,
  impactOverlayEnabled,
}: Pick<
  UseCanvasControllerReadModelArgs,
  | 'graphModel'
  | 'uiScope'
  | 'overlayModel'
  | 'canMutateGraph'
  | 'graphHandlers'
  | 'columnLevelLineageEnabled'
  | 'impactOverlayEnabled'
>) {
  const handlers = useCanvasNodeActionHandlers({
    graphHandlers,
    canMutateGraph,
  });
  const { activeRunId, overlayDecorations, runStatusByNodeId } = overlayModel;

  return useMemo(() => {
    const impactedNodes = buildNodesWithImpact({
      nodes: graphModel.nodes,
      edges: graphModel.edges,
      selectedNodeIds: uiScope.selectedNodeIds,
      impactOverlayEnabled,
      columnLevelLineageEnabled,
      handlers,
    });

    return applyCanvasOverlayModel({
      nodes: impactedNodes,
      activeRunId,
      overlayDecorations,
      runStatusByNodeId,
    });
  }, [
    activeRunId,
    columnLevelLineageEnabled,
    graphModel.edges,
    graphModel.nodes,
    handlers,
    impactOverlayEnabled,
    overlayDecorations,
    runStatusByNodeId,
    uiScope.selectedNodeIds,
  ]);
}

function resolveCanvasInspectorNode(args: {
  canonicalNodesById: ReadonlyMap<string, CanonicalNode>;
  inspectorNodeId: string | null;
}): CanonicalNode | null {
  const { canonicalNodesById, inspectorNodeId } = args;

  return inspectorNodeId == null ? null : (canonicalNodesById.get(inspectorNodeId) ?? null);
}

export function useCanvasControllerReadModel({
  graphModel,
  visibleScope,
  executionScope,
  uiScope,
  overlayModel,
  graphHandlers,
  canMutateGraph,
  columnLevelLineageEnabled,
  impactOverlayEnabled,
}: UseCanvasControllerReadModelArgs) {
  const transformationValidation = useCanvasTransformationValidation({
    visibleScope,
    executionScope,
  });
  const nodesWithImpact = useCanvasNodesWithImpact({
    graphModel,
    uiScope,
    overlayModel,
    canMutateGraph,
    graphHandlers,
    columnLevelLineageEnabled,
    impactOverlayEnabled,
  });
  const inspectorNode = resolveCanvasInspectorNode({
    canonicalNodesById: graphModel.canonicalNodesById,
    inspectorNodeId: uiScope.inspectorNodeId,
  });

  return {
    transformationValidation,
    nodesWithImpact,
    inspectorNode,
  };
}
