/**
 * Owned concern: position the live Canvas keyboard-menu anchor using coordinate data only.
 * @baseline GH-3629: static anchor appearance belongs to CanvasContextMenuView.module.css.
 * @decision Update only x/y custom properties through the view's committed span ref.
 * @consequence Model changes need no extra effect, state or global geometry mutation.
 * @version 1.0.0
 */
import type { CanvasContextMenuPosition } from './canvasInteractionCommandSurface';

export function positionCanvasContextMenuAnchor(
  anchor: HTMLSpanElement | null,
  position: CanvasContextMenuPosition | null
): void {
  if (anchor == null) return;
  anchor.style.setProperty('--canvas-context-menu-anchor-x', `${position?.x ?? 0}px`);
  anchor.style.setProperty('--canvas-context-menu-anchor-y', `${position?.y ?? 0}px`);
}
