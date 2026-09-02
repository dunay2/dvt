/** Owned concern: keep the contextual node workbench reachable inside its work surface. */
export const CANVAS_NODE_WORKBENCH_INSET = 16;
export const CANVAS_NODE_WORKBENCH_DEFAULT_TOP = 64;
const CANVAS_NODE_WORKBENCH_CARD_OVERLAP = 160;
const CANVAS_NODE_WORKBENCH_CARD_TOP_OFFSET = 48;
const KEYBOARD_MOVE_STEP = 8;
const KEYBOARD_MOVE_LARGE_STEP = 32;

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

export type CanvasNodeWorkbenchAnchorBounds = Readonly<{
  left: number;
  right: number;
  top: number;
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

export function resolveAnchoredCanvasNodeWorkbenchPosition(
  anchor: CanvasNodeWorkbenchAnchorBounds,
  bounds: CanvasNodeWorkbenchBounds
): CanvasNodeWorkbenchPosition {
  const rightCandidate = {
    left: anchor.right - CANVAS_NODE_WORKBENCH_CARD_OVERLAP,
    top: anchor.top + CANVAS_NODE_WORKBENCH_CARD_TOP_OFFSET,
  };
  const fitsOnRight =
    rightCandidate.left + bounds.surfaceWidth <=
    bounds.containerWidth - CANVAS_NODE_WORKBENCH_INSET;
  const candidate = fitsOnRight
    ? rightCandidate
    : {
        left: anchor.left - bounds.surfaceWidth + CANVAS_NODE_WORKBENCH_CARD_OVERLAP,
        top: rightCandidate.top,
      };

  return clampCanvasNodeWorkbenchPosition(candidate, bounds);
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

export function preserveCanvasNodeWorkbenchPositionReference(
  current: CanvasNodeWorkbenchPosition,
  next: CanvasNodeWorkbenchPosition
): CanvasNodeWorkbenchPosition {
  return current.left === next.left && current.top === next.top ? current : next;
}

export function resolveCanvasNodeWorkbenchKeyboardDelta(
  key: string,
  shiftKey: boolean
): CanvasNodeWorkbenchDelta | null {
  const step = shiftKey ? KEYBOARD_MOVE_LARGE_STEP : KEYBOARD_MOVE_STEP;

  switch (key) {
    case 'ArrowLeft':
      return { x: -step, y: 0 };
    case 'ArrowRight':
      return { x: step, y: 0 };
    case 'ArrowUp':
      return { x: 0, y: -step };
    case 'ArrowDown':
      return { x: 0, y: step };
    default:
      return null;
  }
}
