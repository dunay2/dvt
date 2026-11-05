/** Owned concern: project the session camera to DOM and reveal guarded keyboard focus. */
import {
  useCallback,
  useLayoutEffect,
  useRef,
  type FocusEventHandler,
  type RefObject,
} from 'react';
import { isCanvasElement } from '../../../components/canvas/canvasNodeInteractionBoundary';
import { useRelationalLayout } from './RelationalLayoutSession';

export function useRelationalViewportCamera(
  viewportRef: RefObject<HTMLDivElement>,
  contentRef: RefObject<HTMLDivElement>,
  zoom: number
) {
  const { autoFit, camera } = useRelationalLayout();
  const projectCamera = useCallback(
    (scale: number) => {
      if (contentRef.current != null)
        contentRef.current.style.translate = `${camera.current.x / scale}px ${camera.current.y / scale}px`;
    },
    [camera, contentRef]
  );
  const panBy = useCallback(
    (dx: number, dy: number, scale = zoom) => {
      autoFit.current = false;
      camera.current = { x: camera.current.x + dx, y: camera.current.y + dy };
      projectCamera(scale);
    },
    [autoFit, camera, projectCamera, zoom]
  );
  // Restore before wheel anchoring measures the new scale; React owns zoom only.
  useLayoutEffect(() => {
    projectCamera(zoom);
  }, [projectCamera, zoom]);

  const projectPointer = useCallback(
    (point: Pick<MouseEvent, 'clientX' | 'clientY'>) => {
      const surface = contentRef.current ?? viewportRef.current;
      if (surface == null) return undefined;
      const bounds = surface.getBoundingClientRect();
      return { x: (point.clientX - bounds.left) / zoom, y: (point.clientY - bounds.top) / zoom };
    },
    [contentRef, viewportRef, zoom]
  );

  const latestPan = useRef(panBy);
  useLayoutEffect(() => {
    latestPan.current = panBy;
  }, [panBy]);
  const onFocusCapture: FocusEventHandler<HTMLDivElement> = (event) => {
    const target = event.target;
    const viewport = event.currentTarget;
    if (!isCanvasElement(target) || !target.matches(':focus-visible')) return;
    target.ownerDocument.defaultView?.requestAnimationFrame(() => {
      if (
        viewportRef.current !== viewport ||
        !viewport.contains(target) ||
        target.ownerDocument.activeElement !== target
      )
        return;
      const nested = target.closest('[data-canvas-viewport]');
      const anchor =
        nested != null && nested !== viewport && viewport.contains(nested) ? nested : target;
      const frame = viewport.getBoundingClientRect();
      const bounds = anchor.getBoundingClientRect();
      if (frame.width <= 0 || frame.height <= 0 || bounds.width <= 0 || bounds.height <= 0) return;
      const reveal = (start: number, end: number, low: number, high: number): number =>
        start < low || end - start > high - low ? low - start : end > high ? high - end : 0;
      latestPan.current(
        reveal(bounds.left, bounds.right, frame.left, frame.right),
        reveal(bounds.top, bounds.bottom, frame.top, frame.bottom)
      );
    });
  };

  return { panBy, onFocusCapture, projectPointer };
}
