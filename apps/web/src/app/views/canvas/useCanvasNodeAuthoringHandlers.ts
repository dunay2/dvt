/** Owned concern: compose node creation, drop, and removal handlers over node authoring contracts. */

import type {
  CanvasAuthoringNodeCreationContracts,
  CanvasNodeAuthoringContracts,
  CanvasNodeDuplicateContracts,
  CanvasNodeDropContracts,
  CreateCanvasAuthoringNode,
} from './canvasGraphHandlerContracts';
import { useCanvasAuthoringNodeCreationHandlers } from './useCanvasAuthoringNodeCreationHandlers';
import { useCanvasNodeDuplicateHandlers } from './useCanvasNodeDuplicateHandlers';
import { useCanvasNodeDropHandlers } from './useCanvasNodeDropHandlers';
import { useCanvasNodeRemovalHandlers } from './useCanvasNodeRemovalHandlers';
import type { CanvasDraftSessionCommandRunner } from './useCanvasWorkspaceDraftSession';

type UseCanvasNodeAuthoringHandlersArgs = CanvasNodeAuthoringContracts;

type UseCanvasNodeAuthoringHandlersResult = {
  handleInstantiateNode: (nodeId: string, position: { x: number; y: number }) => void;
  handleDrop: React.DragEventHandler<HTMLDivElement>;
  handleDragOver: React.DragEventHandler<HTMLDivElement>;
  handleCreateAuthoringNode: CreateCanvasAuthoringNode;
  handleDuplicateNode: (nodeId: string) => void;
  handleRemoveNode: (nodeId: string, intent?: 'placement' | 'empty-definition') => void;
  handleAttachSchemaToNode: (nodeId: string, schemaName: string) => void;
};

export function useCanvasNodeAuthoringHandlers(
  { state, effects, policy }: UseCanvasNodeAuthoringHandlersArgs,
  runDraftSessionCommand: CanvasDraftSessionCommandRunner
): UseCanvasNodeAuthoringHandlersResult {
  const nodeDropContracts: CanvasNodeDropContracts = {
    state: {
      canonicalNodesById: state.canonicalNodesById,
      draftSession: state.draftSession,
      nodes: state.nodes,
    },
    effects,
    policy,
  };
  const nodeDropHandlers = useCanvasNodeDropHandlers(nodeDropContracts);
  const nodeCreationContracts: CanvasAuthoringNodeCreationContracts = {
    state: {
      canonicalNodesById: state.canonicalNodesById,
      draftSession: state.draftSession,
      nodes: state.nodes,
    },
    effects: {
      setNodes: effects.setNodes,
      setDraftSession: effects.setDraftSession,
      setSelectedNodes: effects.setSelectedNodes,
      setInspectorNode: effects.setInspectorNode,
    },
    policy: {
      canEditEdges: policy.canEditEdges,
      columnLevelLineageEnabled: policy.columnLevelLineageEnabled,
      allowsCanonicalNode: policy.allowsCanonicalNode,
    },
  };
  const nodeCreationHandlers = useCanvasAuthoringNodeCreationHandlers(nodeCreationContracts);
  const nodeDuplicateContracts: CanvasNodeDuplicateContracts = {
    state: {
      canonicalNodesById: state.canonicalNodesById,
      draftSession: state.draftSession,
      nodes: state.nodes,
    },
    effects: {
      setNodes: effects.setNodes,
      setDraftSession: effects.setDraftSession,
      setSelectedNodes: effects.setSelectedNodes,
      setInspectorNode: effects.setInspectorNode,
    },
    policy: {
      canEditEdges: policy.canEditEdges,
      columnLevelLineageEnabled: policy.columnLevelLineageEnabled,
    },
  };
  const nodeDuplicateHandlers = useCanvasNodeDuplicateHandlers(nodeDuplicateContracts);

  const nodeRemovalHandlers = useCanvasNodeRemovalHandlers(
    { state, effects, policy },
    runDraftSessionCommand
  );

  return {
    ...nodeDropHandlers,
    ...nodeCreationHandlers,
    ...nodeDuplicateHandlers,
    ...nodeRemovalHandlers,
  };
}
