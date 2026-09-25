/** Owned concern: pan the viewport background without capturing card gestures. */
import { useRef, useState, type MouseEventHandler, type PointerEventHandler } from 'react';

type PanOrigin = Readonly<{ pointerId: number; x: number; y: number; left: number; top: number }>;

export function useRelationalViewportPan() {
  const origin = useRef<PanOrigin | null>(null);
  const [panning, setPanning] = useState(false);
  const [panMode, setPanMode] = useState(false);
  const suppressClick = useRef(false);
  const onPointerDown: PointerEventHandler<HTMLDivElement> = (event) => {
    if (!event.currentTarget.contains(event.target as Node) || origin.current != null) return;
    suppressClick.current = false;
    const control = (event.target as Element).closest(
      'button, input, select, textarea, summary, a, [contenteditable="true"]'
    );
    if (
      (event.button !== 0 && event.button !== 1) ||
      (event.button === 0 &&
        (!panMode ||
          (control != null && control.getAttribute('data-slot') !== 'canvas-relational-tree-node')))
    )
      return;
    event.preventDefault();
    suppressClick.current = event.button === 0;
    origin.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      left: event.currentTarget.scrollLeft,
      top: event.currentTarget.scrollTop,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setPanning(true);
  };
  const onPointerMove: PointerEventHandler<HTMLDivElement> = (event) => {
    const current = origin.current;
    if (current == null || current.pointerId !== event.pointerId) return;
    event.currentTarget.scrollLeft = current.left - (event.clientX - current.x);
    event.currentTarget.scrollTop = current.top - (event.clientY - current.y);
  };
  const onPointerUp: PointerEventHandler<HTMLDivElement> = (event) => {
    if (origin.current?.pointerId !== event.pointerId) return;
    origin.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    setPanning(false);
  };
  const onClickCapture: MouseEventHandler<HTMLDivElement> = (event) => {
    if (!suppressClick.current || !event.currentTarget.contains(event.target as Node)) return;
    suppressClick.current = false;
    event.preventDefault();
    event.stopPropagation();
  };
  const onPointerCancel: PointerEventHandler<HTMLDivElement> = (event) => {
    if (origin.current?.pointerId !== event.pointerId) return;
    suppressClick.current = false;
    onPointerUp(event);
  };
  return {
    panning,
    panMode,
    togglePanMode: () => setPanMode((current) => !current),
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onLostPointerCapture: onPointerCancel,
    onClickCapture,
  };
}
