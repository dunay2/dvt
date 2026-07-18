/** Owned concern: keep the contextual node workbench reachable inside its work surface. */
export const CANVAS_NODE_WORKBENCH_INSET = 16;
export const CANVAS_NODE_WORKBENCH_DEFAULT_TOP = 64;

export type CanvasNodeWorkbenchPosition = Readonly<{
  left: number;
  top: number;
}>;

export type CanvasNodeWorkbenchDelta = Readonly<{
  x: number;
  y: number;
}>;

export type CanvasNodeWorkbenchBounds = Readonly<{
  containerWidth: number;
  containerHeight: number;
  surfaceWidth: number;
  surfaceHeight: number;
}>;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
}

export function clampCanvasNodeWorkbenchPosition(
  position: CanvasNodeWorkbenchPosition,
  bounds: CanvasNodeWorkbenchBounds
): CanvasNodeWorkbenchPosition {
  return {
    left: clamp(
      position.left,
      CANVAS_NODE_WORKBENCH_INSET,
      bounds.containerWidth - bounds.surfaceWidth - CANVAS_NODE_WORKBENCH_INSET
    ),
    top: clamp(
      position.top,
      CANVAS_NODE_WORKBENCH_INSET,
      bounds.containerHeight - bounds.surfaceHeight - CANVAS_NODE_WORKBENCH_INSET
    ),
  };
}

export function resolveDefaultCanvasNodeWorkbenchPosition(
  bounds: CanvasNodeWorkbenchBounds
): CanvasNodeWorkbenchPosition {
  return clampCanvasNodeWorkbenchPosition(
    {
      left: bounds.containerWidth - bounds.surfaceWidth - CANVAS_NODE_WORKBENCH_INSET,
      top: CANVAS_NODE_WORKBENCH_DEFAULT_TOP,
    },
    bounds
  );
}

export function moveCanvasNodeWorkbenchPosition(
  position: CanvasNodeWorkbenchPosition,
  delta: CanvasNodeWorkbenchDelta,
  bounds: CanvasNodeWorkbenchBounds
): CanvasNodeWorkbenchPosition {
  return clampCanvasNodeWorkbenchPosition(
    { left: position.left + delta.x, top: position.top + delta.y },
    bounds
  );
}
