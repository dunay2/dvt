/**
 * Owned concern: share builder inputs for route-owned Canvas shell contract assembly.
 */
import type { CanvasRouteViewState } from './canvasRouteViewState';
import type { useCanvasController } from './useCanvasController';

export type CanvasController = ReturnType<typeof useCanvasController>;

export type CanvasShellBuilderArgs = Readonly<{
  controller: CanvasController;
  routeViewState: CanvasRouteViewState;
}>;
