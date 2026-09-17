/** Owned concern: manage measured fit, zoom and pointer panning for the tree viewport. */
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import type { PointerEventHandler, RefObject } from 'react';
import { useCanvasRelationalTreeWheelZoom } from './useCanvasRelationalTreeWheelZoom';

import {
  calculateCanvasRelationalTreeFit,
  changeCanvasRelationalTreeZoom,
} from './canvasRelationalTreeViewport';

type PanOrigin = Readonly<{ x: number; y: number; left: number; top: number }>;

export function useCanvasRelationalTreeViewport(layoutKey: string): Readonly<{
  viewportRef: RefObject<HTMLDivElement>;
  contentRef: RefObject<HTMLDivElement>;
  zoom: number;
  panning: boolean;
  changeZoom: (delta: number) => void;
  fit: () => void;
  onPointerDown: PointerEventHandler<HTMLDivElement>;
  onPointerMove: PointerEventHandler<HTMLDivElement>;
  onPointerUp: PointerEventHandler<HTMLDivElement>;
}> {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const panOrigin = useRef<PanOrigin | null>(null);
  const [zoom, setZoom] = useState(1);
  const [panning, setPanning] = useState(false);
  useCanvasRelationalTreeWheelZoom(viewportRef, contentRef, zoom, setZoom);

  const center = useCallback((nextZoom: number) => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (viewport == null || content == null) return;
    viewport.scrollLeft = Math.max(0, (content.offsetWidth * nextZoom - viewport.clientWidth) / 2);
    viewport.scrollTop = 0;
  }, []);

  const fit = useCallback(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (viewport == null || content == null) return;
    const nextZoom = calculateCanvasRelationalTreeFit({
      viewportWidth: viewport.clientWidth,
      viewportHeight: viewport.clientHeight,
      contentWidth: content.offsetWidth,
      contentHeight: content.offsetHeight,
    });
    setZoom(nextZoom);
    requestAnimationFrame(() => center(nextZoom));
  }, [center]);

  useLayoutEffect(() => {
    const frame = requestAnimationFrame(fit);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(fit);
    if (viewportRef.current != null) observer?.observe(viewportRef.current, { box: 'border-box' });
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [fit, layoutKey]);

  const changeZoom = useCallback((delta: number) => {
    setZoom((current) => changeCanvasRelationalTreeZoom(current, delta));
  }, []);

  const onPointerDown: PointerEventHandler<HTMLDivElement> = (event) => {
    if (
      (event.button !== 0 && event.button !== 1) ||
      (event.button === 0 &&
        (event.target as Element).closest('button, input, select, summary, a') != null)
    )
      return;
    event.preventDefault();
    panOrigin.current = {
      x: event.clientX,
      y: event.clientY,
      left: event.currentTarget.scrollLeft,
      top: event.currentTarget.scrollTop,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setPanning(true);
  };
  const onPointerMove: PointerEventHandler<HTMLDivElement> = (event) => {
    const origin = panOrigin.current;
    if (origin == null) return;
    event.currentTarget.scrollLeft = origin.left - (event.clientX - origin.x);
    event.currentTarget.scrollTop = origin.top - (event.clientY - origin.y);
  };
  const onPointerUp: PointerEventHandler<HTMLDivElement> = (event) => {
    if (panOrigin.current == null) return;
    panOrigin.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
    setPanning(false);
  };

  return {
    viewportRef,
    contentRef,
    zoom,
    panning,
    changeZoom,
    fit,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  };
}
