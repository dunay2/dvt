/** Owned concern: compose node creation, drop, and removal handlers over node authoring contracts. */

import type {
  CanvasAuthoringNodeCreationContracts,
  CanvasNodeAuthoringContracts,
  CanvasNodeDuplicateContracts,
  CanvasNodeDropContracts,
  CanvasNodeRemovalContracts,
  CreateCanvasAuthoringNode,
} from './canvasGraphHandlerContracts';
import { useCanvasAuthoringNodeCreationHandlers } from './useCanvasAuthoringNodeCreationHandlers';
import { useCanvasNodeDuplicateHandlers } from './useCanvasNodeDuplicateHandlers';
import { useCanvasNodeDropHandlers } from './useCanvasNodeDropHandlers';
import { useCanvasNodeRemovalHandlers } from './useCanvasNodeRemovalHandlers';

type UseCanvasNodeAuthoringHandlersArgs = CanvasNodeAuthoringContracts;

type UseCanvasNodeAuthoringHandlersResult = {
  handleDrop: React.DragEventHandler<HTMLDivElement>;
  handleDragOver: React.DragEventHandler<HTMLDivElement>;
  handleCreateAuthoringNode: CreateCanvasAuthoringNode;
  handleDuplicateNode: (nodeId: string) => void;
  handleRemoveNode: (nodeId: string) => void;
};

export function useCanvasNodeAuthoringHandlers({
  state,
  effects,
  policy,
}: UseCanvasNodeAuthoringHandlersArgs): UseCanvasNodeAuthoringHandlersResult {
  const nodeDropContracts: CanvasNodeDropContracts = {
    effects,
    policy,
  };
  const nodeDropHandlers = useCanvasNodeDropHandlers(nodeDropContracts);
  const nodeCreationContracts: CanvasAuthoringNodeCreationContracts = {
    effects: {
      setNodes: effects.setNodes,
      setDraftSession: effects.setDraftSession,
      setSelectedNodes: effects.setSelectedNodes,
      setInspectorNode: effects.setInspectorNode,
    },
    policy,
  };
  const nodeCreationHandlers =
    useCanvasAuthoringNodeCreationHandlers(nodeCreationContracts);
  const nodeDuplicateContracts: CanvasNodeDuplicateContracts = {
    state: {
      canonicalNodesById: state.canonicalNodesById,
      nodes: state.nodes,
    },
    effects: {
      setNodes: effects.setNodes,
      setDraftSession: effects.setDraftSession,
      setSelectedNodes: effects.setSelectedNodes,
      setInspectorNode: effects.setInspectorNode,
    },
    policy,
  };
  const nodeDuplicateHandlers = useCanvasNodeDuplicateHandlers(nodeDuplicateContracts);

  const nodeRemovalContracts: CanvasNodeRemovalContracts = {
    state,
    effects,
    policy: {
      canEditEdges: policy.canEditEdges,
    },
  };
  const nodeRemovalHandlers = useCanvasNodeRemovalHandlers(nodeRemovalContracts);

  return {
    ...nodeDropHandlers,
    ...nodeCreationHandlers,
    ...nodeDuplicateHandlers,
    ...nodeRemovalHandlers,
  };
}
