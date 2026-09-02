/** Owned concern: compose graph interaction handlers over the local contract-builder component. */

import type {
  CanvasGraphInteractionContracts,
  CanvasGraphInteractionEffects,
  CanvasGraphInteractionPolicy,
  CanvasGraphInteractionState,
} from './canvasGraphHandlerContracts';
import { canvasGraphHandlerContractBuilders } from './canvasGraphHandlerContractBuilders';
import type {
  UseCanvasGraphHandlersParams,
  UseCanvasGraphHandlersResult,
} from './useCanvasGraphHandlers.types';
import { useCanvasEdgeAuthoringHandlers } from './useCanvasEdgeAuthoringHandlers';
import { useCanvasLayoutHandlers } from './useCanvasLayoutHandlers';
import { useCanvasNodeAuthoringHandlers } from './useCanvasNodeAuthoringHandlers';
import { useCanvasSelectionHandlers } from './useCanvasSelectionHandlers';
import { canvasDraftSession } from './canvasDraftSession';
import {
  applyDvtNodeAuthoringMetadata,
  createDvtNodeAuthoringMetadata,
} from './canvasDvtAuthoringModel';
import {
  applyDvtSubstraitProjectionFunction,
  resolveDvtSubstraitProjectionEntry,
} from './canvasDvtSubstraitProjection';
import { useCanvasAlgebraicCompositionHandler } from './useCanvasAlgebraicCompositionHandler';

export function useCanvasGraphHandlers({
  graphStrategy,
  canonicalNodesById,
  edges,
  nodes,
  selectedNodeIds,
  inspectorNodeId,
  draftSession,
  canEditEdges,
  gridSize = 20,
  canvasSnapToGrid = false,
  runtimeCapabilities,
  allowsCanonicalNode,
  focusMode,
  inspectorPanelVisible,
  columnLevelLineageEnabled,
  setNodes,
  setEdges,
  setDraftSession,
  setSelectedNodes,
  reconcileSelectionAfterNodeRemoval,
  setInspectorNode,
  toggleInspectorPanel,
  onLayoutComplete,
}: UseCanvasGraphHandlersParams): UseCanvasGraphHandlersResult {
  const interactionState: CanvasGraphInteractionState = {
    canonicalNodesById,
    draftSession,
    nodes,
    edges,
    selectedNodeIds,
    inspectorNodeId,
    focusMode,
    inspectorPanelVisible,
  };
  const interactionEffects: CanvasGraphInteractionEffects = {
    setNodes,
    setEdges,
    setDraftSession,
    setSelectedNodes,
    reconcileSelectionAfterNodeRemoval,
    setInspectorNode,
    toggleInspectorPanel,
    onLayoutComplete,
  };
  const interactionPolicy: CanvasGraphInteractionPolicy = {
    graphStrategy,
    canEditEdges,
    gridSize,
    canvasSnapToGrid,
    runtimeCapabilities,
    allowsCanonicalNode,
    columnLevelLineageEnabled,
  };
  const interactionContracts: CanvasGraphInteractionContracts = {
    state: interactionState,
    effects: interactionEffects,
    policy: interactionPolicy,
  };

  const edgeAuthoringHandlers = useCanvasEdgeAuthoringHandlers(
    canvasGraphHandlerContractBuilders.edgeAuthoring(interactionContracts)
  );
  const algebraicComposition = useCanvasAlgebraicCompositionHandler(interactionContracts);
  const handleColumnDisclosureChange = (nodeId: string, expanded: boolean) => {
    setNodes((currentNodes) =>
      currentNodes.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, columnDisclosureExpanded: expanded } }
          : node
      )
    );
  };
  const handleApplyDvtSubstraitColumnFunction: UseCanvasGraphHandlersResult['handleApplyDvtSubstraitColumnFunction'] =
    ({ nodeId, columnId, sourceColumnId, capabilityId, alias }) => {
      setDraftSession((currentSession) => {
        const targetNode =
          currentSession.localNodeCatalog?.[nodeId] ?? canonicalNodesById.get(nodeId);
        if (
          targetNode == null ||
          targetNode.pluginId !== 'dvt' ||
          targetNode.kind !== 'dvt:transform'
        ) {
          return currentSession;
        }

        try {
          const metadata = createDvtNodeAuthoringMetadata(targetNode);
          if (
            metadata?.kind !== 'transform' ||
            metadata.mode !== 'substrait' ||
            metadata.shape !== 'projection'
          ) {
            return currentSession;
          }
          const nodeCatalog = new Map(canonicalNodesById);
          Object.values(currentSession.localNodeCatalog ?? {}).forEach((node) =>
            nodeCatalog.set(node.id, node)
          );
          const draft = { plan: metadata.plan, sidecar: metadata.sidecar };
          const projection = resolveDvtSubstraitProjectionEntry({
            targetNode,
            nodes: [...nodeCatalog.values()],
            edges: currentSession.workingSet.visibleEdges,
            draft,
          });
          const output = projection?.outputs.find((candidate) => candidate.fieldId === columnId);
          const sourceOutput =
            sourceColumnId == null
              ? output
              : projection?.outputs.find((candidate) => candidate.fieldId === sourceColumnId);
          if (
            projection == null ||
            output == null ||
            sourceOutput == null ||
            (sourceColumnId != null && sourceColumnId === columnId)
          ) {
            return currentSession;
          }

          const nextDraft = applyDvtSubstraitProjectionFunction(draft, {
            fieldId: output.fieldId,
            ...(sourceColumnId == null ? {} : { inputFieldId: sourceOutput.fieldId }),
            capabilityId,
            alias,
            dataType: sourceOutput.dataType,
            provider: projection.source.sourceRef.connectionRef.provider,
          });
          if (nextDraft === draft) return currentSession;

          return canvasDraftSession.workingSet.upsertNode(
            currentSession,
            applyDvtNodeAuthoringMetadata(targetNode, {
              ...metadata,
              plan: nextDraft.plan,
              sidecar: nextDraft.sidecar,
            })
          );
        } catch {
          return currentSession;
        }
      });
    };
  const selectionHandlers = useCanvasSelectionHandlers(
    canvasGraphHandlerContractBuilders.selection(interactionContracts)
  );
  const layoutHandlers = useCanvasLayoutHandlers(
    canvasGraphHandlerContractBuilders.layout(interactionContracts)
  );
  const nodeAuthoringHandlers = useCanvasNodeAuthoringHandlers(
    canvasGraphHandlerContractBuilders.nodeAuthoring(interactionContracts)
  );

  return {
    ...edgeAuthoringHandlers,
    ...selectionHandlers,
    ...layoutHandlers,
    ...nodeAuthoringHandlers,
    handleColumnDisclosureChange,
    handleApplyDvtSubstraitColumnFunction,
    resolveCanvasAlgebraicCompositionOperations: algebraicComposition.resolveOperations,
    handleComposeCanvasNodes: algebraicComposition.composeNodes,
  };
}
