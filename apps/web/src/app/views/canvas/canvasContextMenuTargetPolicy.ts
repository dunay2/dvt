/** Owned concern: decide which DOM targets may open the Canvas background context menu. */
import type { ContextMenuEvent } from './canvasContextMenuPresenter.types';
import type { CanvasContextMenuPosition } from './canvasInteractionCommandSurface';

export function isCanvasViewportContextTarget(target: EventTarget | null): target is Element {
  if (!(target instanceof Element)) {
    return false;
  }

  return (
    target.closest(
      [
        '[data-slot="canvas-context-menu"]',
        '.react-flow__node',
        '.react-flow__edge',
        '.react-flow__controls',
        '.react-flow__minimap',
      ].join(',')
    ) == null
  );
}

export function resolveCanvasViewportContextMenuRequest(
  event: ContextMenuEvent
): CanvasContextMenuPosition | null {
  if (!isCanvasViewportContextTarget(event.target)) {
    return null;
  }

  return { x: event.clientX, y: event.clientY };
}
