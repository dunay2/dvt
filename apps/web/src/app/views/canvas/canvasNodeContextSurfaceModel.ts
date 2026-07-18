/** Owned concern: keep transient node surfaces mutually exclusive across Canvas hosts. */
import type { GraphNodeOperationalDetail } from '../../plugins/graph/graphNodeCardStrategyContracts';

export type CanvasNodeFloatingToolbarAnchor = Readonly<{
  nodeId: string;
  nodeName: string;
  position: { x: number; y: number };
  nodeTop: number;
  contextMenuTrigger: Element | null;
}>;

export type CanvasNodeHealthPopoverModel = Readonly<{
  nodeId: string;
  detail: GraphNodeOperationalDetail;
  position: { x: number; y: number };
}>;

export type CanvasNodeContextActiveSurface =
  | Readonly<{ kind: 'idle' }>
  | Readonly<{ kind: 'toolbar'; anchor: CanvasNodeFloatingToolbarAnchor }>
  | Readonly<{ kind: 'health'; model: CanvasNodeHealthPopoverModel }>;

export type CanvasNodeContextSurfaceState = Readonly<{
  externalSurfaceActive: boolean;
  activeSurface: CanvasNodeContextActiveSurface;
}>;

export type CanvasNodeContextSurfaceEvent =
  | Readonly<{ type: 'open-toolbar'; anchor: CanvasNodeFloatingToolbarAnchor }>
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
    case 'toolbar':
      return surface.anchor.nodeId;
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
    case 'open-toolbar':
      return state.externalSurfaceActive
        ? state
        : { ...state, activeSurface: { kind: 'toolbar', anchor: event.anchor } };
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
