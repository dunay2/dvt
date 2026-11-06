/** Owned concern: decide which DOM targets may open the Canvas background context menu.
 * @baseline GH-3629: the graph viewport contains independent controls and menu owners.
 * @decision Exclude interactive and owned surfaces from the existing background query.
 * @consequence Widening the viewport boundary cannot introduce background commands on controls.
 * @version 1.1.0
 */
import type { ContextMenuEvent } from './canvasContextMenuPresenter.types';
import type { CanvasContextMenuPosition } from './canvasInteractionCommandSurface';
import { isCanvasInteractionControlTarget } from './canvasViewportInteraction';
import { isCanvasElement } from '../../components/canvas/canvasNodeInteractionBoundary';

export function isCanvasViewportContextTarget(target: EventTarget | null): target is Element {
  if (!isCanvasElement(target) || isCanvasInteractionControlTarget(target)) {
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
        '[data-slot="canvas-graph-search-control"]',
        '[data-slot="canvas-graph-filter-control"]',
        '[data-slot="graph-node-health-popover"]',
        '[role="search"]',
        '[role="menu"]',
        '[role="dialog"]',
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
