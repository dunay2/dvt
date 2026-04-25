import type { Edge, Node } from '@xyflow/react';
import type { Dispatch, SetStateAction } from 'react';

import type { CanvasGraphStrategy } from '../../plugins/dbt/dbtNodeAdapter';
import type { NodeKindRegistration } from '../../plugins/nodeTypeContracts';
import type { CanonicalNode } from '../../types/canonical';
import type { CanvasDraftSession } from './canvasDraftSession';

/** Owned concern: semantic contracts for Canvas graph interaction handler seams. */
type CanvasNodeSetter = Dispatch<SetStateAction<Node[]>>;
type CanvasEdgeSetter = Dispatch<SetStateAction<Edge[]>>;
type CanvasDraftSessionSetter = Dispatch<SetStateAction<CanvasDraftSession>>;

export type CanvasGraphInteractionState = {
  canonicalNodesById: Map<string, CanonicalNode>;
  draftSession: CanvasDraftSession;
  nodes: Node[];
  edges: Edge[];
  selectedNodeIds: string[];
  inspectorNodeId: string | null;
  focusMode: boolean;
  inspectorPanelVisible: boolean;
};

export type CanvasGraphInteractionEffects = {
  setNodes: CanvasNodeSetter;
  setEdges: CanvasEdgeSetter;
  setDraftSession: CanvasDraftSessionSetter;
  setSelectedNodes: (ids: string[]) => void;
  setInspectorNode: (nodeId: string | null) => void;
  toggleInspectorPanel: () => void;
  onLayoutComplete: (positions: Record<string, { x: number; y: number }>) => void;
};

export type CanvasGraphInteractionPolicy = {
  graphStrategy: CanvasGraphStrategy;
  canEditEdges: boolean;
  columnLevelLineageEnabled: boolean;
};

export type CanvasGraphInteractionContracts = {
  state: CanvasGraphInteractionState;
  effects: CanvasGraphInteractionEffects;
  policy: CanvasGraphInteractionPolicy;
};

export type ConfirmEdgeModalState = {
  open: boolean;
  edge: { source: string; target: string; type: string } | null;
};

export type CanvasNodeAuthoringState = {
  canonicalNodesById: Map<string, CanonicalNode>;
  draftSession: CanvasDraftSession;
  nodes: Node[];
  edges: Edge[];
  selectedNodeIds: string[];
  inspectorNodeId: string | null;
};

export type CanvasNodeAuthoringEffects = {
  setNodes: CanvasNodeSetter;
  setEdges: CanvasEdgeSetter;
  setDraftSession: CanvasDraftSessionSetter;
  setSelectedNodes: (ids: string[]) => void;
  setInspectorNode: (nodeId: string | null) => void;
};

export type CanvasNodeAuthoringPolicy = {
  graphStrategy: CanvasGraphStrategy;
  canEditEdges: boolean;
  columnLevelLineageEnabled: boolean;
};

export type CanvasNodeAuthoringContracts = {
  state: CanvasNodeAuthoringState;
  effects: CanvasNodeAuthoringEffects;
  policy: CanvasNodeAuthoringPolicy;
};

export type CanvasNodeDuplicateState = {
  canonicalNodesById: Map<string, CanonicalNode>;
  nodes: Node[];
};

export type CanvasNodeDuplicateEffects = {
  setNodes: CanvasNodeSetter;
  setDraftSession: CanvasDraftSessionSetter;
  setSelectedNodes: (ids: string[]) => void;
  setInspectorNode: (nodeId: string | null) => void;
};

export type CanvasNodeDuplicatePolicy = {
  graphStrategy: CanvasGraphStrategy;
  canEditEdges: boolean;
  columnLevelLineageEnabled: boolean;
};

export type CanvasNodeDuplicateContracts = {
  state: CanvasNodeDuplicateState;
  effects: CanvasNodeDuplicateEffects;
  policy: CanvasNodeDuplicatePolicy;
};

export type CanvasNodeDropEffects = {
  setNodes: CanvasNodeSetter;
  setDraftSession: CanvasDraftSessionSetter;
};

export type CanvasNodeDropPolicy = {
  graphStrategy: CanvasGraphStrategy;
  canEditEdges: boolean;
  columnLevelLineageEnabled: boolean;
};

export type CanvasNodeDropContracts = {
  effects: CanvasNodeDropEffects;
  policy: CanvasNodeDropPolicy;
};

export type CanvasAuthoringNodeCreationEffects = {
  setNodes: CanvasNodeSetter;
  setDraftSession: CanvasDraftSessionSetter;
  setSelectedNodes: (ids: string[]) => void;
  setInspectorNode: (nodeId: string | null) => void;
};

export type CanvasAuthoringNodeCreationPolicy = {
  graphStrategy: CanvasGraphStrategy;
  canEditEdges: boolean;
  columnLevelLineageEnabled: boolean;
};

export type CanvasAuthoringNodeCreationContracts = {
  effects: CanvasAuthoringNodeCreationEffects;
  policy: CanvasAuthoringNodeCreationPolicy;
};

export type CreateCanvasAuthoringNode = (registration: NodeKindRegistration) => void;

export type CanvasNodeRemovalState = {
  draftSession: CanvasDraftSession;
  nodes: Node[];
  edges: Edge[];
  selectedNodeIds: string[];
  inspectorNodeId: string | null;
};

export type CanvasNodeRemovalEffects = {
  setNodes: CanvasNodeSetter;
  setEdges: CanvasEdgeSetter;
  setDraftSession: CanvasDraftSessionSetter;
  setSelectedNodes: (ids: string[]) => void;
  setInspectorNode: (nodeId: string | null) => void;
};

export type CanvasNodeRemovalPolicy = {
  canEditEdges: boolean;
};

export type CanvasNodeRemovalContracts = {
  state: CanvasNodeRemovalState;
  effects: CanvasNodeRemovalEffects;
  policy: CanvasNodeRemovalPolicy;
};

export type CanvasEdgeAuthoringState = {
  canonicalNodesById: Map<string, CanonicalNode>;
  edges: Edge[];
};

export type CanvasEdgeAuthoringEffects = {
  setEdges: CanvasEdgeSetter;
  setDraftSession: CanvasDraftSessionSetter;
};

export type CanvasEdgeAuthoringPolicy = {
  canEditEdges: boolean;
};

export type CanvasEdgeAuthoringContracts = {
  state: CanvasEdgeAuthoringState;
  effects: CanvasEdgeAuthoringEffects;
  policy: CanvasEdgeAuthoringPolicy;
};

export type CanvasLayoutState = {
  nodes: Node[];
  edges: Edge[];
};

export type CanvasLayoutEffects = {
  setNodes: CanvasNodeSetter;
  setEdges: CanvasEdgeSetter;
  onLayoutComplete: (positions: Record<string, { x: number; y: number }>) => void;
};

export type CanvasLayoutPolicy = {
  canEditEdges: boolean;
};

export type CanvasLayoutContracts = {
  state: CanvasLayoutState;
  effects: CanvasLayoutEffects;
  policy: CanvasLayoutPolicy;
};

export type CanvasSelectionState = {
  canonicalNodesById: Map<string, CanonicalNode>;
  selectedNodeIds: string[];
  focusMode: boolean;
  inspectorPanelVisible: boolean;
};

export type CanvasSelectionEffects = {
  setSelectedNodes: (ids: string[]) => void;
  setInspectorNode: (nodeId: string | null) => void;
  toggleInspectorPanel: () => void;
};

export type CanvasSelectionContracts = {
  state: CanvasSelectionState;
  effects: CanvasSelectionEffects;
};
