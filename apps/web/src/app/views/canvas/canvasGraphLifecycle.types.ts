/** Owned concern: define Canvas graph lifecycle contracts for node and edge transition components. */

import type { Edge, EdgeChange, Node, NodeChange } from '@xyflow/react';

import type { CanvasDraftSession } from './canvasDraftSession';
import type { CanonicalNode } from '../../types/canonical';

export type CanvasGraphLifecycleState = {
  draftSession: CanvasDraftSession;
  nodes: Node[];
  edges: Edge[];
  selectedNodeIds: string[];
  inspectorNodeId: string | null;
};

export type CanvasGraphLifecycleNodeRemovalResult =
  | {
      outcome: 'noop';
      state: CanvasGraphLifecycleState;
    }
  | {
      outcome: 'removed';
      removedNodeName: string;
      state: CanvasGraphLifecycleState;
    };

export type CanvasGraphLifecycleNodeApi = {
  applyLocalChanges: (nodes: Node[], changes: NodeChange[]) => Node[];
  applyChanges: (
    state: CanvasGraphLifecycleState,
    changes: NodeChange[]
  ) => CanvasGraphLifecycleState;
  remove: (
    state: CanvasGraphLifecycleState,
    nodeId: string
  ) => CanvasGraphLifecycleNodeRemovalResult;
  admitExplicit: (
    draftSession: CanvasDraftSession,
    canonicalNode: CanonicalNode
  ) => CanvasDraftSession;
  queueImported: (draftSession: CanvasDraftSession, nodeIds: string[]) => CanvasDraftSession;
};

export type CanvasGraphLifecycleEdgeApi = {
  applyChanges: (
    state: CanvasGraphLifecycleState,
    changes: EdgeChange<Edge>[]
  ) => CanvasGraphLifecycleState;
  replaceVisible: (draftSession: CanvasDraftSession, edges: Edge[]) => CanvasDraftSession;
};
