/** Owned concern: manage measured fit, zoom and pointer panning for the tree viewport. */
import { useCallback, useLayoutEffect, useRef } from 'react';
import type { RefObject } from 'react';
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
}> &
  ReturnType<typeof useRelationalViewportPan> {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const { autoFit, scroll, zoom, setZoom, minimumZoom, setMinimumZoom, contentSize, setExtent } =
    useRelationalLayout();
  const pan = useRelationalViewportPan();
  const setManualZoom = useCallback(
    (value: number) => {
      autoFit.current = false;
      setZoom(value);
    },
    [autoFit, setZoom]
  );
  useCanvasRelationalTreeWheelZoom(viewportRef, contentRef, zoom, setManualZoom, minimumZoom);
  const center = useCallback(
    (nextZoom: number) => {
      const viewport = viewportRef.current;
      const content = contentRef.current;
      if (viewport == null || content == null) return;
      viewport.scrollLeft = Math.max(
        0,
        ((contentSize.current?.width ?? content.offsetWidth) * nextZoom - viewport.clientWidth) / 2
      );
      viewport.scrollTop = 0;
    },
    [contentSize]
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

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (viewport == null) return;
    viewport.scrollLeft = scroll.current.left;
    viewport.scrollTop = scroll.current.top;
    return () => {
      scroll.current = { left: viewport.scrollLeft, top: viewport.scrollTop };
    };
  }, [scroll]);

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
    ...pan,
  };
}
