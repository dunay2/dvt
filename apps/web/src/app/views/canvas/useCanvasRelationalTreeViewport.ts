/** Owned concern: manage measured fit, zoom and pointer panning for the tree viewport. */
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { useCanvasRelationalTreeWheelZoom } from './useCanvasRelationalTreeWheelZoom';
import {
  CANVAS_RELATIONAL_TREE_MIN_ZOOM,
  calculateCanvasRelationalTreeFit,
  changeCanvasRelationalTreeZoom,
} from './canvasRelationalTreeViewport';
import { useRelationalViewportPan } from './relational-layout/useRelationalViewportPan';
export function useCanvasRelationalTreeViewport(
  layoutKey: string,
  fitPadding = 32
): Readonly<{
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
  const autoFit = useRef(true);
  const [zoom, setZoom] = useState(1);
  const [minimumZoom, setMinimumZoom] = useState(CANVAS_RELATIONAL_TREE_MIN_ZOOM);
  const pan = useRelationalViewportPan();
  const setManualZoom = useCallback((value: number) => {
    autoFit.current = false;
    setZoom(value);
  }, []);
  useCanvasRelationalTreeWheelZoom(viewportRef, contentRef, zoom, setManualZoom, minimumZoom);
  const center = useCallback((nextZoom: number) => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (viewport == null || content == null) return;
    viewport.scrollLeft = Math.max(0, (content.offsetWidth * nextZoom - viewport.clientWidth) / 2);
    viewport.scrollTop = 0;
  }, []);

  const fit = useCallback(() => {
    autoFit.current = true;
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (viewport == null || content == null) return;
    const nextZoom = calculateCanvasRelationalTreeFit({
      viewportWidth: viewport.clientWidth,
      viewportHeight: viewport.clientHeight,
      contentWidth: content.offsetWidth,
      contentHeight: content.offsetHeight,
      padding: fitPadding,
    });
    setZoom(nextZoom);
    setMinimumZoom(Math.min(CANVAS_RELATIONAL_TREE_MIN_ZOOM, nextZoom));
    requestAnimationFrame(() => center(nextZoom));
  }, [center, fitPadding]);

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
  }, [fit, layoutKey]);

  const changeZoom = useCallback(
    (delta: number) => {
      autoFit.current = false;
      setZoom((current) => changeCanvasRelationalTreeZoom(current, delta, minimumZoom));
    },
    [minimumZoom]
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
