import type { Dispatch, SetStateAction } from 'react';
import type { Edge, Node } from '@xyflow/react';

import type { CanvasDraftSession } from './canvasDraftSession';
import type { CanvasUiScope } from './canvasDraftScope';

/** Owned concern: semantic contracts for Canvas mutation handler seams. */

type CanvasDraftSessionSetter = Dispatch<SetStateAction<CanvasDraftSession>>;

export type CanvasGraphModelLike = {
  nodes: Node[];
  edges: Edge[];
  setNodes: (value: Node[] | ((currentNodes: Node[]) => Node[])) => void;
  setEdges: (value: Edge[] | ((currentEdges: Edge[]) => Edge[])) => void;
};

export type CanvasMutationState = {
  graphModel: CanvasGraphModelLike;
  draftSession: CanvasDraftSession;
  uiScope: CanvasUiScope;
  selectedNodeIds: string[];
};

export type CanvasMutationEffects = {
  setDraftSession: CanvasDraftSessionSetter;
  setSelectedNodes: (nodeIds: string[]) => void;
  setInspectorNode: (nodeId: string | null) => void;
  showInspectorPanel: () => void;
  setCurrentPlan: (value: null) => void;
};

export type CanvasMutationPolicy = {
  canMutateGraph: boolean;
  workspaceLayoutKey: string;
};

export type CanvasMutationContracts = {
  state: CanvasMutationState;
  effects: CanvasMutationEffects;
  policy: CanvasMutationPolicy;
};

export type CanvasGraphChangeState = {
  graphModel: CanvasGraphModelLike;
  draftSession: CanvasDraftSession;
  uiScope: CanvasUiScope;
  selectedNodeIds: string[];
};

export type CanvasGraphChangeEffects = {
  setDraftSession: CanvasDraftSessionSetter;
  setSelectedNodes: (nodeIds: string[]) => void;
  setInspectorNode: (nodeId: string | null) => void;
};

export type CanvasGraphChangeContracts = {
  state: CanvasGraphChangeState;
  effects: CanvasGraphChangeEffects;
};

export type CanvasNodeChangeState = {
  graphModel: CanvasGraphModelLike;
  draftSession: CanvasDraftSession;
  uiScope: CanvasUiScope;
  selectedNodeIds: string[];
};

export type CanvasNodeChangeEffects = {
  setDraftSession: CanvasDraftSessionSetter;
  setSelectedNodes: (nodeIds: string[]) => void;
  setInspectorNode: (nodeId: string | null) => void;
};

export type CanvasNodeChangeContracts = {
  state: CanvasNodeChangeState;
  effects: CanvasNodeChangeEffects;
};

export type CanvasEdgeChangeState = {
  graphModel: CanvasGraphModelLike;
  draftSession: CanvasDraftSession;
};

export type CanvasEdgeChangeEffects = {
  setDraftSession: CanvasDraftSessionSetter;
};

export type CanvasEdgeChangeContracts = {
  state: CanvasEdgeChangeState;
  effects: CanvasEdgeChangeEffects;
};

export type CanvasSourceImportEffects = {
  setDraftSession: CanvasDraftSessionSetter;
  setSelectedNodes: (nodeIds: string[]) => void;
  setInspectorNode: (nodeId: string | null) => void;
  showInspectorPanel: () => void;
  setCurrentPlan: (value: null) => void;
};

export type CanvasSourceImportPolicy = {
  canMutateGraph: boolean;
  workspaceLayoutKey: string;
};

export type CanvasSourceImportContracts = {
  effects: CanvasSourceImportEffects;
  policy: CanvasSourceImportPolicy;
};
