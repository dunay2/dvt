import type { Edge, Node, ReactFlowProps } from '@xyflow/react';
import type { Dispatch, SetStateAction } from 'react';
import type { GraphNodeColumnPortIdentity } from '../../plugins/graph/graphNodeColumnContracts';
import type { CanvasColumnLineageEdgeData } from './canvasColumnLineageProjection';
import type {
  CanvasAlgebraicCompositionIdentity,
  CanvasAlgebraicCompositionOperation,
} from './canvasAlgebraicComposition';

import type {
  CanvasGraphInteractionEffects,
  CanvasGraphInteractionPolicy,
  CanvasGraphInteractionState,
  ConfirmEdgeModalState,
  CreateCanvasAuthoringNode,
} from './canvasGraphHandlerContracts';

export type UseCanvasGraphHandlersParams = CanvasGraphInteractionState &
  CanvasGraphInteractionEffects &
  Omit<CanvasGraphInteractionPolicy, 'gridSize' | 'canvasSnapToGrid'> &
  Partial<Pick<CanvasGraphInteractionPolicy, 'gridSize' | 'canvasSnapToGrid'>>;

export type UseCanvasGraphHandlersResult = {
  confirmEdgeModal: ConfirmEdgeModalState;
  setConfirmEdgeModal: Dispatch<SetStateAction<ConfirmEdgeModalState>>;
  onConnect: NonNullable<ReactFlowProps<Node, Edge>['onConnect']>;
  onReconnect: NonNullable<ReactFlowProps<Node, Edge>['onReconnect']>;
  confirmEdgeCreation: () => void;
  handleInspectNode: (nodeId: string, preferredTabId?: string | null) => void;
  handleAutoLayout: () => void;
  handleDrop: React.DragEventHandler<HTMLDivElement>;
  handleDragOver: React.DragEventHandler<HTMLDivElement>;
  handleCreateAuthoringNode: CreateCanvasAuthoringNode;
  handleDuplicateNode: (nodeId: string) => void;
  handleToggleNodeSelection: (nodeId: string, shouldSelect: boolean) => void;
  handleRemoveNode: (nodeId: string) => void;
  handleAttachSchemaToNode: (nodeId: string, schemaName: string) => void;
  activeColumnHandleId: string | null;
  handleColumnPortActivate: (identity: GraphNodeColumnPortIdentity) => void;
  handleApplyDvtSubstraitColumnFunction: (identity: {
    nodeId: string;
    columnId: string;
    capabilityId: string;
  }) => void;
  handleToggleDvtSubstraitColumnOutput: (identity: {
    nodeId: string;
    columnId: string;
    columnType: string;
    output: boolean;
  }) => void;
  handleReorderDvtSubstraitColumnOutput: (identity: {
    nodeId: string;
    columnId: string;
    targetColumnId: string;
    placement: 'before' | 'after';
  }) => void;
  handleColumnDisclosureChange: (nodeId: string, expanded: boolean) => void;
  handleAutomapCanvasColumns: (
    nodeId: string,
    columns: readonly Readonly<{ name: string; type: string }>[]
  ) => void;
  handleRemoveColumnMapping: (mapping: CanvasColumnLineageEdgeData) => void;
  resolveCanvasAlgebraicCompositionOperations: (
    identity: CanvasAlgebraicCompositionIdentity
  ) => CanvasAlgebraicCompositionOperation[];
  handleComposeCanvasNodes: (
    identity: CanvasAlgebraicCompositionIdentity & {
      operation: CanvasAlgebraicCompositionOperation;
    }
  ) => void;
};
