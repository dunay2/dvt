import type { Edge, Node, ReactFlowProps } from '@xyflow/react';
import type { Dispatch, SetStateAction } from 'react';

import type { CanvasGraphStrategy } from '../../plugins/dbt/dbtNodeAdapter';
import type { CanonicalNode } from '../../types/canonical';

export type ConfirmEdgeModalState = {
  open: boolean;
  edge: { source: string; target: string; type: string } | null;
};

export type UseCanvasGraphHandlersParams = {
  graphStrategy: CanvasGraphStrategy;
  canonicalNodesById: Map<string, CanonicalNode>;
  edges: Edge[];
  nodes: Node[];
  selectedNodeIds: string[];
  inspectorNodeId: string | null;
  focusMode: boolean;
  inspectorPanelVisible: boolean;
  columnLevelLineageEnabled: boolean;
  setNodes: Dispatch<SetStateAction<Node[]>>;
  setEdges: Dispatch<SetStateAction<Edge[]>>;
  setSelectedNodes: (ids: string[]) => void;
  setInspectorNode: (nodeId: string | null) => void;
  toggleInspectorPanel: () => void;
};

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
  handleToggleNodeSelection: (nodeId: string, shouldSelect: boolean) => void;
  handleRemoveNode: (nodeId: string) => void;
};
