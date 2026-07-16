import { useMemo } from 'react';
import type { Edge, Node } from '@xyflow/react';

import { buildNodesWithImpact } from './canvasImpactOverlay';
import { validateTransformationGraph } from './transformationGraphValidation';
import type { RuntimeCapabilities } from '../../plugins/registry';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { UseCanvasGraphHandlersResult } from './useCanvasGraphHandlers.types';
import {
  canOfferDbtExecutionSelectionToggle,
  isDbtExecutionSelectableNode,
} from './dbtExecutionScopePolicy';

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
    | 'handleInspectNode'
    | 'handleDuplicateNode'
    | 'handleRemoveNode'
    | 'handleToggleNodeSelection'
    | 'handleAttachSchemaToNode'
  >;
  onToggleExecutionSelection: (nodeId: string, shouldSelect: boolean) => void;
  activeCanvasKind: string;
  runtimeCapabilities?: RuntimeCapabilities;
  canMutateGraph: boolean;
  canSelectExecution: boolean;
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
  onToggleExecutionSelection,
  activeCanvasKind,
  runtimeCapabilities,
  canMutateGraph,
  canSelectExecution,
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
        canMutateGraph,
        impactOverlayEnabled,
        columnLevelLineageEnabled,
        handlers: {
          onInspectNode: graphHandlers.handleInspectNode,
          onDuplicateNode: canMutateGraph ? graphHandlers.handleDuplicateNode : undefined,
          onRemoveNode: canMutateGraph ? graphHandlers.handleRemoveNode : undefined,
          onToggleNodeSelection: canSelectExecution ? onToggleExecutionSelection : undefined,
          onAttachSchemaToNode: canMutateGraph ? graphHandlers.handleAttachSchemaToNode : undefined,
        },
      }).map((node) => {
        const canonicalNode = graphModel.canonicalNodesById.get(node.id);
        const selectedForExecution = uiScope.selectedNodeIds.includes(node.id);
        const canSelectNode =
          canSelectExecution &&
          (activeCanvasKind !== 'dbt' ||
            canOfferDbtExecutionSelectionToggle({
              isExecutableRoot:
                canonicalNode != null && isDbtExecutionSelectableNode(canonicalNode),
              selectedForExecution,
            }));

        return {
          ...node,
          data: {
            ...node.data,
            onToggleNodeSelection: canSelectNode ? onToggleExecutionSelection : undefined,
            activeRunId: overlayModel.activeRunId,
            canvasKind: activeCanvasKind,
            runStatusByNodeId: overlayModel.runStatusByNodeId,
            overlayDecoration: overlayModel.overlayDecorations.get(node.id) ?? null,
            runtimeCapabilities,
          },
        };
      }),
    [
      canMutateGraph,
      canSelectExecution,
      columnLevelLineageEnabled,
      graphHandlers.handleInspectNode,
      graphHandlers.handleDuplicateNode,
      graphHandlers.handleRemoveNode,
      graphHandlers.handleAttachSchemaToNode,
      onToggleExecutionSelection,
      graphModel.canonicalNodesById,
      graphModel.edges,
      graphModel.nodes,
      activeCanvasKind,
      impactOverlayEnabled,
      overlayModel.activeRunId,
      overlayModel.overlayDecorations,
      overlayModel.runStatusByNodeId,
      runtimeCapabilities,
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
