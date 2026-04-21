/** Owned concern: maps the broad graph interaction seam into sub-handler contracts. */

import type {
  CanvasEdgeAuthoringContracts,
  CanvasGraphInteractionContracts,
  CanvasLayoutContracts,
  CanvasNodeAuthoringContracts,
  CanvasSelectionContracts,
} from './canvasGraphHandlerContracts';

export function buildCanvasEdgeAuthoringContracts(
  contracts: CanvasGraphInteractionContracts
): CanvasEdgeAuthoringContracts {
  return {
    state: {
      canonicalNodesById: contracts.state.canonicalNodesById,
      edges: contracts.state.edges,
    },
    effects: {
      setEdges: contracts.effects.setEdges,
      setDraftSession: contracts.effects.setDraftSession,
    },
    policy: {
      canEditEdges: contracts.policy.canEditEdges,
    },
  };
}

export function buildCanvasSelectionContracts(
  contracts: CanvasGraphInteractionContracts
): CanvasSelectionContracts {
  return {
    state: contracts.state,
    effects: contracts.effects,
  };
}

export function buildCanvasLayoutContracts(
  contracts: CanvasGraphInteractionContracts
): CanvasLayoutContracts {
  return {
    state: {
      nodes: contracts.state.nodes,
      edges: contracts.state.edges,
    },
    effects: {
      setNodes: contracts.effects.setNodes,
      setEdges: contracts.effects.setEdges,
      onLayoutComplete: contracts.effects.onLayoutComplete,
    },
    policy: {
      canEditEdges: contracts.policy.canEditEdges,
    },
  };
}

export function buildCanvasNodeAuthoringContracts(
  contracts: CanvasGraphInteractionContracts
): CanvasNodeAuthoringContracts {
  return {
    state: {
      draftSession: contracts.state.draftSession,
      nodes: contracts.state.nodes,
      edges: contracts.state.edges,
      selectedNodeIds: contracts.state.selectedNodeIds,
      inspectorNodeId: contracts.state.inspectorNodeId,
    },
    effects: {
      setNodes: contracts.effects.setNodes,
      setEdges: contracts.effects.setEdges,
      setDraftSession: contracts.effects.setDraftSession,
      setSelectedNodes: contracts.effects.setSelectedNodes,
      setInspectorNode: contracts.effects.setInspectorNode,
    },
    policy: {
      graphStrategy: contracts.policy.graphStrategy,
      canEditEdges: contracts.policy.canEditEdges,
      columnLevelLineageEnabled: contracts.policy.columnLevelLineageEnabled,
    },
  };
}
