import type { Dispatch, SetStateAction } from 'react';
import type {
  Edge,
  EdgeChange,
  Node,
  NodeChange,
} from '@xyflow/react';

import type { ImportSourcesResult } from '../../ports/workspace';
import type { CanvasDraftSession } from './canvasDraftSession';
import type { CanvasUiScope } from './canvasDraftScope';

export type CanvasGraphModelLike = {
  nodes: Node[];
  edges: Edge[];
  setNodes: (value: Node[] | ((currentNodes: Node[]) => Node[])) => void;
  setEdges: (value: Edge[] | ((currentEdges: Edge[]) => Edge[])) => void;
};

export type UseCanvasMutationHandlersArgs = {
  canMutateGraph: boolean;
  workspaceLayoutKey: string;
  graphModel: CanvasGraphModelLike;
  draftSession: CanvasDraftSession;
  uiScope: CanvasUiScope;
  selectedNodeIds: string[];
  setDraftSession: Dispatch<SetStateAction<CanvasDraftSession>>;
  setSelectedNodes: (nodeIds: string[]) => void;
  setInspectorNode: (nodeId: string | null) => void;
  showInspectorPanel: () => void;
  setCurrentPlan: (value: null) => void;
};

export type CanvasGraphChangeHandlers = {
  handleNodesChange: (changes: NodeChange[]) => void;
  handleEdgesChange: (changes: EdgeChange<Edge>[]) => void;
};

export type CanvasSourceImportHandlers = {
  importedNodeFocusIds: string[];
  handleSourceImportComplete: (result: ImportSourcesResult) => void;
  handleImportedNodeFocusComplete: () => void;
};
