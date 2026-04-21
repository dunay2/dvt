/** Owned concern: compose node-drop and node-removal handlers over node authoring contracts. */

import type {
  CanvasNodeAuthoringContracts,
  CanvasNodeDropContracts,
  CanvasNodeRemovalContracts,
} from './canvasGraphHandlerContracts';
import { useCanvasNodeDropHandlers } from './useCanvasNodeDropHandlers';
import { useCanvasNodeRemovalHandlers } from './useCanvasNodeRemovalHandlers';

type UseCanvasNodeAuthoringHandlersArgs = CanvasNodeAuthoringContracts;

type UseCanvasNodeAuthoringHandlersResult = {
  handleDrop: React.DragEventHandler<HTMLDivElement>;
  handleDragOver: React.DragEventHandler<HTMLDivElement>;
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
    ...nodeRemovalHandlers,
  };
}
