import { canvasGraphLifecycleEdge } from './canvasGraphLifecycle.edge';
import { canvasGraphLifecycleNode } from './canvasGraphLifecycle.node';

export type {
  CanvasGraphLifecycleEdgeApi,
  CanvasGraphLifecycleNodeApi,
  CanvasGraphLifecycleNodeRemovalResult,
  CanvasGraphLifecycleState,
} from './canvasGraphLifecycle.types';

// CanvasGraphLifecycle is the public component API for graph mutation concerns.
export const canvasGraphLifecycle = {
  node: canvasGraphLifecycleNode,
  edge: canvasGraphLifecycleEdge,
} as const;
