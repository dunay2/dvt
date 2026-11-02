/** Owned concern: manage measured fit, zoom and pointer panning for the tree viewport. */
import { useCallback, useLayoutEffect, useRef } from 'react';
import type { FocusEventHandler, RefObject } from 'react';
import { isCanvasElement } from '../../components/canvas/canvasNodeInteractionBoundary';
import { useCanvasRelationalTreeWheelZoom } from './useCanvasRelationalTreeWheelZoom';
import {
  CANVAS_RELATIONAL_TREE_MIN_ZOOM,
  calculateCanvasRelationalTreeFit,
  changeCanvasRelationalTreeZoom,
} from './canvasRelationalTreeViewport';
import { useRelationalViewportPan } from './relational-layout/useRelationalViewportPan';
import { useRelationalLayout } from './relational-layout/RelationalLayoutSession';
export function useCanvasRelationalTreeViewport(fitPadding = 32): Readonly<{
  viewportRef: RefObject<HTMLDivElement>;
  contentRef: RefObject<HTMLDivElement>;
  zoom: number;
  minimumZoom: number;
  changeZoom: (delta: number) => void;
  fit: () => void;
  stopAutoFit: () => void;
  onFocusCapture: FocusEventHandler<HTMLDivElement>;
}> &
  ReturnType<typeof useRelationalViewportPan> {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const { autoFit, camera, zoom, setZoom, minimumZoom, setMinimumZoom, contentSize, setExtent } =
    useRelationalLayout();
  const projectCamera = useCallback(
    (scale: number) => {
      if (contentRef.current != null)
        contentRef.current.style.translate = `${camera.current.x / scale}px ${camera.current.y / scale}px`;
    },
    [camera]
  );
  const panBy = useCallback(
    (dx: number, dy: number, scale = zoom) => {
      autoFit.current = false;
      camera.current = { x: camera.current.x + dx, y: camera.current.y + dy };
      projectCamera(scale);
    },
    [autoFit, camera, projectCamera, zoom]
  );
  const pan = useRelationalViewportPan(panBy);
  // Restore before wheel anchoring measures the new scale; React owns zoom only.
  useLayoutEffect(() => {
    projectCamera(zoom);
  }, [projectCamera, zoom]);
  const setManualZoom = useCallback(
    (value: number) => {
      autoFit.current = false;
      setZoom(value);
    },
    [autoFit, setZoom]
  );
  useCanvasRelationalTreeWheelZoom(
    viewportRef,
    contentRef,
    zoom,
    setManualZoom,
    minimumZoom,
    panBy
  );
  const center = useCallback(
    (nextZoom: number) => {
      const viewport = viewportRef.current;
      const content = contentRef.current;
      if (viewport == null || content == null) return;
      const padding =
        Number.parseFloat(
          viewport.ownerDocument.defaultView?.getComputedStyle(viewport).paddingLeft ?? '0'
        ) || 0;
      const x =
        (viewport.clientWidth - (contentSize.current?.width ?? content.offsetWidth) * nextZoom) /
          2 -
        padding;
      panBy(x - camera.current.x, -camera.current.y, nextZoom);
    },
    [camera, contentSize, panBy]
  );

  const fit = useCallback(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (viewport == null || content == null) return;
    if (
      viewport.clientWidth <= 0 ||
      viewport.clientHeight <= 0 ||
      content.offsetWidth <= 0 ||
      content.offsetHeight <= 0
    )
      return;
    const nextZoom = calculateCanvasRelationalTreeFit({
      viewportWidth: viewport.clientWidth,
      viewportHeight: viewport.clientHeight,
      contentWidth: contentSize.current?.width ?? content.offsetWidth,
      contentHeight: contentSize.current?.height ?? content.offsetHeight,
      padding: fitPadding,
    });
    autoFit.current = false;
    setExtent(null);
    setZoom(nextZoom);
    setMinimumZoom(Math.min(CANVAS_RELATIONAL_TREE_MIN_ZOOM, nextZoom));
    requestAnimationFrame(() => center(nextZoom));
  }, [autoFit, center, contentSize, fitPadding, setExtent, setMinimumZoom, setZoom]);

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

  useLayoutEffect(() => {
    const refresh = (): void => {
      if (autoFit.current) fit();
    };
    const frame = requestAnimationFrame(refresh);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(refresh);
    if (viewportRef.current != null) observer?.observe(viewportRef.current, { box: 'border-box' });
    if (contentRef.current != null) observer?.observe(contentRef.current, { box: 'border-box' });
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [autoFit, fit]);

  const changeZoom = useCallback(
    (delta: number) => {
      autoFit.current = false;
      setZoom((current) => changeCanvasRelationalTreeZoom(current, delta, minimumZoom));
    },
    [autoFit, minimumZoom, setZoom]
  );

  return {
    viewportRef,
    contentRef,
    zoom,
    minimumZoom,
    changeZoom,
    fit,
    stopAutoFit: () => {
      autoFit.current = false;
    },
    onFocusCapture,
    ...pan,
  };
}
