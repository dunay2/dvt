import type { Edge, Node, ReactFlowProps } from '@xyflow/react';
import type { Dispatch, SetStateAction } from 'react';

import type {
  CanvasGraphInteractionEffects,
  CanvasGraphInteractionPolicy,
  CanvasGraphInteractionState,
  ConfirmEdgeModalState,
  CreateCanvasAuthoringNode,
} from './canvasGraphHandlerContracts';

export type UseCanvasGraphHandlersParams = CanvasGraphInteractionState &
  CanvasGraphInteractionEffects &
  CanvasGraphInteractionPolicy;

export type UseCanvasGraphHandlersResult = {
  confirmEdgeModal: ConfirmEdgeModalState;
  setConfirmEdgeModal: Dispatch<SetStateAction<ConfirmEdgeModalState>>;
  onConnect: NonNullable<ReactFlowProps<Node, Edge>['onConnect']>;
  confirmEdgeCreation: () => void;
  handleInspectNode: (nodeId: string) => void;
  handleNodeClick: NonNullable<ReactFlowProps<Node, Edge>['onNodeClick']>;
  onSelectionChange: NonNullable<ReactFlowProps<Node, Edge>['onSelectionChange']>;
  handleAutoLayout: () => void;
  handleDrop: React.DragEventHandler<HTMLDivElement>;
  handleDragOver: React.DragEventHandler<HTMLDivElement>;
  handleCreateAuthoringNode: CreateCanvasAuthoringNode;
  handleToggleNodeSelection: (nodeId: string, shouldSelect: boolean) => void;
  handleRemoveNode: (nodeId: string) => void;
};
