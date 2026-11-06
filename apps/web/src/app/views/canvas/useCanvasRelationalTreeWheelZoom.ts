/** Owned concern: translate viewport-local wheel input into cursor-anchored presentation zoom. */
import { useLayoutEffect, useRef, type RefObject } from 'react';
import { isCanvasTextEditingTarget, isCanvasViewportTarget } from './canvasViewportInteraction';
import { CANVAS_RELATIONAL_TREE_MAX_ZOOM } from './canvasRelationalTreeViewport';

type WheelAnchor = Readonly<{
  clientX: number;
  clientY: number;
  contentX: number;
  contentY: number;
}>;

export function useCanvasRelationalTreeWheelZoom(
  viewportRef: RefObject<HTMLDivElement>,
  contentRef: RefObject<HTMLDivElement>,
  zoom: number,
  setZoom: (value: number) => void,
  minimumZoom: number,
  panBy: (dx: number, dy: number) => void
): void {
  const anchor = useRef<WheelAnchor | null>(null);
  const pendingZoom = useRef(zoom);

  useLayoutEffect(() => {
    pendingZoom.current = zoom;
    const viewport = viewportRef.current;
    const content = contentRef.current;
    const point = anchor.current;
    anchor.current = null;
    if (viewport == null || content == null || point == null) return;
    const bounds = content.getBoundingClientRect();
    panBy(
      point.clientX - bounds.left - point.contentX * zoom,
      point.clientY - bounds.top - point.contentY * zoom
    );
  }, [zoom, viewportRef, contentRef, panBy]);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (viewport == null) return;
    const onWheel = (event: WheelEvent): void => {
      const content = contentRef.current;
      if (
        content == null ||
        event.defaultPrevented ||
        !isCanvasViewportTarget(event.target, viewport) ||
        event.deltaY === 0 ||
        !Number.isFinite(event.deltaY) ||
        isCanvasTextEditingTarget(event.target)
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      const unit =
        event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? Math.max(1, viewport.clientHeight) : 1;
      const nextZoom = Math.min(
        CANVAS_RELATIONAL_TREE_MAX_ZOOM,
        Math.max(minimumZoom, pendingZoom.current * Math.exp(-event.deltaY * unit * 0.0015))
      );
      if (nextZoom === pendingZoom.current) return;
      const bounds = content.getBoundingClientRect();
      anchor.current = {
        clientX: event.clientX,
        clientY: event.clientY,
        contentX: (event.clientX - bounds.left) / zoom,
        contentY: (event.clientY - bounds.top) / zoom,
      };
      pendingZoom.current = nextZoom;
      setZoom(nextZoom);
    };
    // Zoom owns this gesture, so native page scrolling must remain cancelable.
    viewport.addEventListener('wheel', onWheel, { passive: false });
    return () => viewport.removeEventListener('wheel', onWheel);
  }, [zoom, setZoom, viewportRef, contentRef, minimumZoom]);
}
