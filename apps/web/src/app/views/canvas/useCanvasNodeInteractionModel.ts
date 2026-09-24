import { useMemo } from 'react';
import type { Node } from '@xyflow/react';
import { getGraphNodeCardStrategies } from '../../plugins/graphStrategyRegistry';
import { buildCanvasNodeInteractionPresentation } from './canvasNodeInteractionPresentation';
import { projectCanvasNodeColumnInteraction } from './canvasNodeColumnInteraction';
import { projectCanvasNodeAccessibleHealth } from './canvasNodeMapper';
import type { CanonicalNode, CanonicalEdge } from '../../types/canonical';
import type { RuntimeCapabilities } from '../../plugins/registry';
import type {
  CanvasCardActions,
  CanvasColumnActions,
  CanvasCompositionActions,
} from './canvasNodeInteractionPresentation';

type Args = {
  graphModel: {
    canonicalNodesById: Map<string, CanonicalNode>;
    edges: { source: string; target: string }[];
  };
  visibleScope: { canonicalEdges: CanonicalEdge[] };
  uiScope: { selectedNodeIds: string[] };
  overlayModel: {
    activeRunId: string | null;
    runStatusByNodeId: ReadonlyMap<string, string>;
    overlayDecorations: ReadonlyMap<string, unknown>;
  };
  cardActions: CanvasCardActions;
  columnActions: CanvasColumnActions;
  compositionActions: CanvasCompositionActions;
  activeColumnHandleId: string | null;
  onToggleExecutionSelection: (nodeId: string, shouldSelect: boolean) => void;
  runtimeCapabilities?: RuntimeCapabilities;
  canMutateGraph: boolean;
  canSelectExecution: boolean;
  columnLevelLineageEnabled: boolean;
  semanticGraphNodes: Node[];
  readOnlyColumnLineageNodeIds: ReadonlySet<string>;
};
export function useCanvasNodeInteractionModel({
  graphModel,
  visibleScope,
  uiScope,
  overlayModel,
  cardActions,
  columnActions,
  compositionActions,
  onToggleExecutionSelection,
  runtimeCapabilities,
  canMutateGraph,
  canSelectExecution,
  columnLevelLineageEnabled,
  activeColumnHandleId,
  semanticGraphNodes,
  readOnlyColumnLineageNodeIds,
}: Args): Node[] {
  const graphNodeCardStrategies = useMemo(
    () => getGraphNodeCardStrategies(runtimeCapabilities),
    [runtimeCapabilities]
  );
  const columnFunctionNodes = useMemo(
    () => (canMutateGraph ? [...graphModel.canonicalNodesById.values()] : undefined),
    [canMutateGraph, graphModel.canonicalNodesById]
  );
  const columnFunctionEdges = useMemo(
    () =>
      !canMutateGraph
        ? undefined
        : graphModel.edges.length > 0
          ? graphModel.edges.map((edge) => ({
              sourceId: edge.source,
              targetId: edge.target,
            }))
          : visibleScope.canonicalEdges,
    [canMutateGraph, graphModel.edges, visibleScope.canonicalEdges]
  );
  const semanticNodesWithImpact = useMemo(
    () =>
      buildCanvasNodeInteractionPresentation({
        nodes: semanticGraphNodes,
        selectedNodeIds: uiScope.selectedNodeIds,
        canMutateGraph,
        columnLevelLineageEnabled,
        handlers: {
          onInspectNode: cardActions.onInspectNode,
          onDuplicateNode: canMutateGraph ? cardActions.onDuplicateNode : undefined,
          onRemoveNode: canMutateGraph ? cardActions.onRemoveNode : undefined,
          onToggleNodeSelection: canSelectExecution ? onToggleExecutionSelection : undefined,
          onAttachSchemaToNode: canMutateGraph ? cardActions.onAttachSchemaToNode : undefined,
          onColumnPortActivate: canMutateGraph ? columnActions.onColumnPortActivate : undefined,
          onApplyCanvasColumnFunction: canMutateGraph
            ? columnActions.onApplyCanvasColumnFunction
            : undefined,
          onApplyCanvasStructuredField: canMutateGraph
            ? columnActions.onApplyCanvasStructuredField
            : undefined,
          onAddCanvasCalculatedColumn: canMutateGraph
            ? columnActions.onAddCanvasCalculatedColumn
            : undefined,
          onToggleCanvasColumnOutput: canMutateGraph
            ? columnActions.onToggleCanvasColumnOutput
            : undefined,
          onReorderCanvasColumnOutput: canMutateGraph
            ? columnActions.onReorderCanvasColumnOutput
            : undefined,
          onColumnDisclosureChange: columnActions.onColumnDisclosureChange,
          onAutomapColumns: canMutateGraph ? columnActions.onAutomapColumns : undefined,
          resolveAlgebraicCompositionOperations: canMutateGraph
            ? compositionActions.resolveAlgebraicCompositionOperations
            : undefined,
          onComposeCanvasNodes: canMutateGraph
            ? compositionActions.onComposeCanvasNodes
            : undefined,
        },
      }).map((node) => {
        const projected = projectCanvasNodeColumnInteraction(node, {
          canonicalNodesById: graphModel.canonicalNodesById,
          columnFunctionNodes,
          columnFunctionEdges,
          readOnlyColumnLineageNodeIds,
        });
        const data = {
          ...projected.data,
          activeRunId: overlayModel.activeRunId,
          runStatusByNodeId: overlayModel.runStatusByNodeId,
          overlayDecoration: overlayModel.overlayDecorations.get(node.id) ?? null,
          runtimeCapabilities,
          activeColumnHandleId,
        };
        const canonicalNode = graphModel.canonicalNodesById.get(node.id);
        return canonicalNode == null
          ? { ...projected, data }
          : projectCanvasNodeAccessibleHealth({
              node: projected,
              canonicalNode,
              data,
              graphNodeCardStrategies,
            });
      }),
    [
      canMutateGraph,
      canSelectExecution,
      columnFunctionEdges,
      columnFunctionNodes,
      columnLevelLineageEnabled,
      cardActions.onInspectNode,
      cardActions.onDuplicateNode,
      cardActions.onRemoveNode,
      cardActions.onAttachSchemaToNode,
      activeColumnHandleId,
      columnActions.onAutomapColumns,
      columnActions.onColumnDisclosureChange,
      columnActions.onColumnPortActivate,
      columnActions.onApplyCanvasColumnFunction,
      columnActions.onApplyCanvasStructuredField,
      columnActions.onAddCanvasCalculatedColumn,
      columnActions.onReorderCanvasColumnOutput,
      columnActions.onToggleCanvasColumnOutput,
      compositionActions.resolveAlgebraicCompositionOperations,
      compositionActions.onComposeCanvasNodes,
      onToggleExecutionSelection,
      graphModel.canonicalNodesById,
      semanticGraphNodes,
      graphNodeCardStrategies,
      overlayModel.activeRunId,
      overlayModel.overlayDecorations,
      overlayModel.runStatusByNodeId,
      runtimeCapabilities,
      readOnlyColumnLineageNodeIds,
      uiScope.selectedNodeIds,
    ]
  );

  return semanticNodesWithImpact;
}
