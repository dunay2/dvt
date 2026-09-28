/** Owned concern: translate pointer/keyboard gestures to local card positions only. */
import { useRef, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react';
import type { CardPosition } from '../canvasRelationalTreeGeometry';

export type RelationalMovableCard = Readonly<
  CardPosition & {
    id: string;
    offset?: CardPosition;
    expansionOrigin?: CardPosition;
  }
>;

function authoredCoordinate(value: number, origin = 0, offset = 0): number {
  return Math.max(
    0,
    origin > 0 && value < origin + offset ? (value * origin) / (origin + offset) : value - offset
  );
}

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
  cards: readonly RelationalMovableCard[],
  zoom: number,
  commitPosition: (id: string, position: CardPosition) => void,
  onManualLayout?: () => void,
  enabled = true
) {
  const drag = useRef<Drag | null>(null);
  const suppressClick = useRef(false);
  const setPosition = (id: string, position: CardPosition) => {
    const card = cards.find((item) => item.id === id);
    commitPosition(id, {
      x: authoredCoordinate(position.x, card?.expansionOrigin?.x, card?.offset?.x),
      y: authoredCoordinate(position.y, card?.expansionOrigin?.y, card?.offset?.y),
    });
  };
  const locate = (target: EventTarget) => {
    const element = (target as Element).closest<HTMLElement>('[data-relational-card-id]');
    const card = cards.find((item) => item.id === element?.dataset.relationalCardId);
    return element != null && card != null ? { element, card } : null;
  };
  const finish = (cancel: boolean) => {
    const current = drag.current;
    if (current == null) return;
    drag.current = null;
    delete current.target.dataset.dragging;
    suppressClick.current = current.moved;
    if (cancel && current.moved) setPosition(current.id, current.origin);
    if (current.target.hasPointerCapture(current.pointerId))
      current.target.releasePointerCapture(current.pointerId);
  };
  return {
    onPointerDown: (event: PointerEvent<HTMLDivElement>) => {
      if (!enabled || event.button !== 0 || drag.current != null) return;
      suppressClick.current = false;
      const hit = locate(event.target);
      if (hit == null) return;
      event.stopPropagation();
      hit.element.setPointerCapture(event.pointerId);
      drag.current = {
        id: hit.card.id,
        pointerId: event.pointerId,
        target: hit.element,
        origin: { x: hit.card.x, y: hit.card.y },
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
      current.target.dataset.dragging = 'true';
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
      if (
        !enabled ||
        !event.altKey ||
        !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)
      )
        return;
      const hit = locate(event.target);
      if (hit == null) return;
      event.preventDefault();
      event.stopPropagation();
      onManualLayout?.();
      const step = event.shiftKey ? 40 : 10;
      setPosition(hit.card.id, {
        x: Math.max(
          0,
          hit.card.x + (event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0)
        ),
        y: Math.max(
          0,
          hit.card.y + (event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0)
        ),
      });
    },
  };
}
