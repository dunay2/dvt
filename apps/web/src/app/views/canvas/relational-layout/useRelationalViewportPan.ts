/** Owned concern: pan the viewport background without capturing card gestures. */
import { useRef, useState, type MouseEventHandler, type PointerEventHandler } from 'react';
import {
  canStartCanvasBackgroundPan,
  consumeCanvasDragClick,
  isCanvasBackgroundTarget,
} from '../canvasViewportInteraction';

type PanOrigin = Readonly<{ pointerId: number; x: number; y: number }>;

export function useRelationalViewportPan(onPan: (dx: number, dy: number) => void) {
  const origin = useRef<PanOrigin | null>(null);
  const [panning, setPanning] = useState(false);
  const suppressClick = useRef(false);
  const onPointerDown: PointerEventHandler<HTMLDivElement> = (event) => {
    if (origin.current != null) return;
    suppressClick.current = false;
    if (!canStartCanvasBackgroundPan(event)) return;
    event.preventDefault();
    event.stopPropagation();
    origin.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setPanning(true);
  };
  const onPointerMove: PointerEventHandler<HTMLDivElement> = (event) => {
    const current = origin.current;
    if (current == null || current.pointerId !== event.pointerId) return;
    event.stopPropagation();
    const dx = event.clientX - current.x;
    const dy = event.clientY - current.y;
    suppressClick.current ||= dx !== 0 || dy !== 0;
    origin.current = { pointerId: current.pointerId, x: event.clientX, y: event.clientY };
    onPan(dx, dy);
  };
  const onPointerUp: PointerEventHandler<HTMLDivElement> = (event) => {
    if (origin.current?.pointerId !== event.pointerId) return;
    event.stopPropagation();
    origin.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    setPanning(false);
  };
  const onClickCapture: MouseEventHandler<HTMLDivElement> = (event) => {
    consumeCanvasDragClick(
      event,
      suppressClick,
      isCanvasBackgroundTarget(event.target, event.currentTarget)
    );
  };
  const onPointerCancel: PointerEventHandler<HTMLDivElement> = (event) => {
    if (origin.current?.pointerId !== event.pointerId) return;
    suppressClick.current = false;
    onPointerUp(event);
  };
  return {
    panning,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onLostPointerCapture: onPointerCancel,
    onClickCapture,
  };
}
