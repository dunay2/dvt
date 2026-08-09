/** Owned concern: keep transient node detail surfaces coherent across Canvas hosts. */
import type { GraphNodeOperationalDetail } from '../../plugins/graph/graphNodeCardStrategyContracts';

export type CanvasNodeHealthPopoverModel = Readonly<{
  nodeId: string;
  detail: GraphNodeOperationalDetail;
  position: { x: number; y: number };
}>;

export type CanvasNodeContextActiveSurface =
  | Readonly<{ kind: 'idle' }>
  | Readonly<{ kind: 'health'; model: CanvasNodeHealthPopoverModel }>;

export type CanvasNodeContextSurfaceState = Readonly<{
  externalSurfaceActive: boolean;
  activeSurface: CanvasNodeContextActiveSurface;
}>;

export type CanvasNodeContextSurfaceEvent =
  | Readonly<{ type: 'open-health'; model: CanvasNodeHealthPopoverModel }>
  | Readonly<{ type: 'close-transient-surface' }>
  | Readonly<{ type: 'remove-node'; nodeId: string }>
  | Readonly<{ type: 'synchronize-external-surface'; active: boolean }>;

const IDLE_SURFACE: CanvasNodeContextActiveSurface = Object.freeze({ kind: 'idle' });

export function createCanvasNodeContextSurfaceState(): CanvasNodeContextSurfaceState {
  return {
    externalSurfaceActive: false,
    activeSurface: IDLE_SURFACE,
  };
}

function activeSurfaceNodeId(surface: CanvasNodeContextActiveSurface): string | null {
  switch (surface.kind) {
    case 'health':
      return surface.model.nodeId;
    case 'idle':
      return null;
  }
}

export function reduceCanvasNodeContextSurface(
  state: CanvasNodeContextSurfaceState,
  event: CanvasNodeContextSurfaceEvent
): CanvasNodeContextSurfaceState {
  switch (event.type) {
    case 'open-health':
      return state.externalSurfaceActive
        ? state
        : { ...state, activeSurface: { kind: 'health', model: event.model } };
    case 'close-transient-surface':
      return state.activeSurface.kind === 'idle'
        ? state
        : { ...state, activeSurface: IDLE_SURFACE };
    case 'remove-node':
      return activeSurfaceNodeId(state.activeSurface) === event.nodeId
        ? { ...state, activeSurface: IDLE_SURFACE }
        : state;
    case 'synchronize-external-surface':
      if (state.externalSurfaceActive === event.active && state.activeSurface.kind === 'idle') {
        return state;
      }
      return {
        externalSurfaceActive: event.active,
        activeSurface: event.active ? IDLE_SURFACE : state.activeSurface,
      };
  }
}
