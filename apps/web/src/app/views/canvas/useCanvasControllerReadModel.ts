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

  const nodesWithImpact = useMemo(
    () =>
      buildNodesWithImpact({
        nodes: graphModel.nodes,
        edges: graphModel.edges,
        selectedNodeIds: uiScope.selectedNodeIds,
        impactOverlayEnabled,
        columnLevelLineageEnabled,
        handlers: {
          onInspectNode: graphHandlers.handleInspectNode,
          onDuplicateNode: canMutateGraph ? graphHandlers.handleDuplicateNode : undefined,
          onRemoveNode: canMutateGraph ? graphHandlers.handleRemoveNode : undefined,
          onToggleNodeSelection: graphHandlers.handleToggleNodeSelection,
        },
      }).map((node) => ({
        ...node,
        data: {
          ...node.data,
          activeRunId: overlayModel.activeRunId,
          runStatusByNodeId: overlayModel.runStatusByNodeId,
          overlayDecoration: overlayModel.overlayDecorations.get(node.id) ?? null,
        },
      })),
    [
      canMutateGraph,
      columnLevelLineageEnabled,
      graphHandlers.handleInspectNode,
      graphHandlers.handleDuplicateNode,
      graphHandlers.handleRemoveNode,
      graphHandlers.handleToggleNodeSelection,
      graphModel.edges,
      graphModel.nodes,
      impactOverlayEnabled,
      overlayModel.activeRunId,
      overlayModel.overlayDecorations,
      overlayModel.runStatusByNodeId,
      uiScope.selectedNodeIds,
    ]
  );

  const inspectorNode = uiScope.inspectorNodeId
    ? (graphModel.canonicalNodesById.get(uiScope.inspectorNodeId) ?? null)
    : null;

  return {
    transformationValidation,
    nodesWithImpact,
    inspectorNode,
  };
}
