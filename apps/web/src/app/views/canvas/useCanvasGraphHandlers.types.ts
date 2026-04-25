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
  onReconnect: NonNullable<ReactFlowProps<Node, Edge>['onReconnect']>;
  confirmEdgeCreation: () => void;
  handleInspectNode: (nodeId: string) => void;
  handleNodeClick: NonNullable<ReactFlowProps<Node, Edge>['onNodeClick']>;
  onSelectionChange: NonNullable<ReactFlowProps<Node, Edge>['onSelectionChange']>;
  handleAutoLayout: () => void;
  handleDrop: React.DragEventHandler<HTMLDivElement>;
  handleDragOver: React.DragEventHandler<HTMLDivElement>;
  handleCreateAuthoringNode: CreateCanvasAuthoringNode;
  handleDuplicateNode: (nodeId: string) => void;
  handleToggleNodeSelection: (nodeId: string, shouldSelect: boolean) => void;
  handleRemoveNode: (nodeId: string) => void;
};
