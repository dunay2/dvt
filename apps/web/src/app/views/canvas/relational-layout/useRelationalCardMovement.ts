/** Owned concern: translate pointer/keyboard gestures to local card positions only. */
import { useRef, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react';
import type { CardPosition, CanvasRelationalTreePlacedNode } from '../canvasRelationalTreeGeometry';

type Drag = {
  id: string;
  pointerId: number;
  target: HTMLElement;
  origin: CardPosition;
  pointer: CardPosition;
  zoom: number;
  moved: boolean;
};
export function useRelationalCardMovement(
  nodes: readonly CanvasRelationalTreePlacedNode[],
  zoom: number,
  setPosition: (id: string, position: CardPosition) => void,
  onManualLayout?: () => void
) {
  const drag = useRef<Drag | null>(null);
  const suppressClick = useRef(false);
  const locate = (target: EventTarget) => {
    const element = (target as Element).closest<HTMLElement>(
      '[data-slot="canvas-relational-tree-node"]'
    );
    const placed = nodes.find((item) => item.node.locator === element?.dataset.locator);
    return element != null && placed != null ? { element, placed } : null;
  };
  const finish = (cancel: boolean) => {
    const current = drag.current;
    if (current == null) return;
    drag.current = null;
    suppressClick.current = current.moved;
    if (cancel && current.moved) setPosition(current.id, current.origin);
    if (current.target.hasPointerCapture(current.pointerId))
      current.target.releasePointerCapture(current.pointerId);
  };
  return {
    onPointerDown: (event: PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0 || drag.current != null) return;
      suppressClick.current = false;
      const hit = locate(event.target);
      if (hit == null) return;
      event.stopPropagation();
      hit.element.setPointerCapture(event.pointerId);
      drag.current = {
        id: hit.placed.node.relationId ?? hit.placed.node.locator,
        pointerId: event.pointerId,
        target: hit.element,
        origin: { x: hit.placed.x, y: hit.placed.y },
        pointer: { x: event.clientX, y: event.clientY },
        zoom,
        moved: false,
      };
    },
    onPointerMove: (event: PointerEvent<HTMLDivElement>) => {
      const current = drag.current;
      if (current == null || current.pointerId !== event.pointerId) return;
      const dx = event.clientX - current.pointer.x;
      const dy = event.clientY - current.pointer.y;
      if (!current.moved && Math.hypot(dx, dy) < 4) return;
      event.preventDefault();
      event.stopPropagation();
      if (!current.moved) onManualLayout?.();
      current.moved = true;
      setPosition(current.id, {
        x: Math.max(0, current.origin.x + dx / current.zoom),
        y: Math.max(0, current.origin.y + dy / current.zoom),
      });
    },
    onPointerUp: (event: PointerEvent<HTMLDivElement>) => {
      if (drag.current?.pointerId === event.pointerId) finish(false);
    },
    onPointerCancel: (event: PointerEvent<HTMLDivElement>) => {
      if (drag.current?.pointerId === event.pointerId) finish(true);
    },
    onLostPointerCapture: (event: PointerEvent<HTMLDivElement>) => {
      if (drag.current?.pointerId === event.pointerId) finish(true);
    },
    onClickCapture: (event: MouseEvent<HTMLDivElement>) => {
      if (!suppressClick.current || locate(event.target) == null) return;
      suppressClick.current = false;
      event.preventDefault();
      event.stopPropagation();
    },
    onKeyDownCapture: (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape' && drag.current != null) {
        event.preventDefault();
        event.stopPropagation();
        finish(true);
        return;
      }
      suppressClick.current = false;
      if (!event.altKey || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key))
        return;
      const hit = locate(event.target);
      if (hit == null) return;
      event.preventDefault();
      event.stopPropagation();
      onManualLayout?.();
      const step = event.shiftKey ? 40 : 10;
      setPosition(hit.placed.node.relationId ?? hit.placed.node.locator, {
        x: Math.max(
          0,
          hit.placed.x + (event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0)
        ),
        y: Math.max(
          0,
          hit.placed.y + (event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0)
        ),
      });
    },
  };
}
