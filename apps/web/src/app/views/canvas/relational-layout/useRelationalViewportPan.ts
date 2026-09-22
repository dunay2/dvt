/** Owned concern: pan the viewport background without capturing card gestures. */
import { useRef, useState, type PointerEventHandler } from 'react';

type PanOrigin = Readonly<{ pointerId: number; x: number; y: number; left: number; top: number }>;

export function useRelationalViewportPan() {
  const origin = useRef<PanOrigin | null>(null);
  const [panning, setPanning] = useState(false);
  const onPointerDown: PointerEventHandler<HTMLDivElement> = (event) => {
    if (
      !event.currentTarget.contains(event.target as Node) ||
      (event.button !== 0 && event.button !== 1) ||
      (event.button === 0 &&
        (event.target as Element).closest('button, input, select, summary, a') != null)
    )
      return;
    event.preventDefault();
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
    event.currentTarget.releasePointerCapture(event.pointerId);
    setPanning(false);
  };
  return { panning, onPointerDown, onPointerMove, onPointerUp };
}
