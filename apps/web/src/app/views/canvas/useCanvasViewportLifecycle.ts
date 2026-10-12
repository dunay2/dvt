/** Owned concern: apply imperative React Flow viewport effects for the Canvas viewport. */
import { useEffect, type CSSProperties, type RefObject } from 'react';

import { applyCanvasViewportStyle } from './canvasViewportStyle';

type CanvasViewportPosition = Readonly<{ x: number; y: number; zoom: number }>;

type CanvasViewportReactFlowApi = Readonly<{
  setViewport: (
    viewport: CanvasViewportPosition,
    options: Readonly<{ duration: number }>
  ) => Promise<unknown>;
}>;

type CanvasViewportLifecycleArgs = Readonly<{
  viewportRef: RefObject<HTMLDivElement>;
  canvasStyle: CSSProperties;
  viewport: CanvasViewportPosition | null;
  reactFlow: CanvasViewportReactFlowApi;
}>;

export function useCanvasViewportLifecycle({
  viewportRef,
  canvasStyle,
  viewport,
  reactFlow,
}: CanvasViewportLifecycleArgs): void {
  useEffect(() => {
    if (viewportRef.current == null) {
      return;
    }

    applyCanvasViewportStyle(viewportRef.current, canvasStyle);
  }, [canvasStyle, viewportRef]);

  useEffect(() => {
    if (viewport == null) {
      return;
    }

    reactFlow.setViewport(viewport, { duration: 0 }).catch(() => undefined);
  }, [reactFlow, viewport]);
}

export type { CanvasViewportPosition, CanvasViewportReactFlowApi };
