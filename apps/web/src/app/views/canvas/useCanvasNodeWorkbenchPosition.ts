/** Owned concern: adapt pointer, keyboard, and viewport geometry to the workbench position model. */
import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type RefObject,
} from 'react';

import {
  CANVAS_NODE_WORKBENCH_DEFAULT_TOP,
  CANVAS_NODE_WORKBENCH_INSET,
  clampCanvasNodeWorkbenchPosition,
  moveCanvasNodeWorkbenchPosition,
  resolveDefaultCanvasNodeWorkbenchPosition,
  type CanvasNodeWorkbenchBounds,
  type CanvasNodeWorkbenchPosition,
} from './canvasNodeWorkbenchPositionModel';

const DEFAULT_SURFACE_WIDTH = 448;
const DEFAULT_SURFACE_HEIGHT = 640;
const KEYBOARD_MOVE_STEP = 8;
const KEYBOARD_MOVE_LARGE_STEP = 32;

type CanvasNodeWorkbenchDragState = Readonly<{
  pointerId: number;
  origin: CanvasNodeWorkbenchPosition;
  startX: number;
  startY: number;
}>;

type CanvasNodeWorkbenchPositionController = Readonly<{
  dragHandleProps: Pick<HTMLAttributes<HTMLDivElement>, 'onKeyDown' | 'onPointerDown'>;
  position: CanvasNodeWorkbenchPosition;
  surfacePointerProps: Pick<
    Required<HTMLAttributes<HTMLDivElement>>,
    'onPointerCancel' | 'onPointerMove' | 'onPointerUp'
  >;
  surfaceRef: RefObject<HTMLDivElement>;
}>;

function resolveDimension(primary: number, secondary: number, fallback: number): number {
  if (primary > 0) {
    return primary;
  }
  if (secondary > 0) {
    return secondary;
  }
  return fallback;
}

function readWorkbenchBounds(surface: HTMLDivElement | null): CanvasNodeWorkbenchBounds {
  const container =
    surface?.offsetParent instanceof HTMLElement ? surface.offsetParent : surface?.parentElement;
  const containerRect = container?.getBoundingClientRect();
  const surfaceRect = surface?.getBoundingClientRect();
  const viewportWidth = typeof window === 'undefined' ? DEFAULT_SURFACE_WIDTH : window.innerWidth;
  const viewportHeight =
    typeof window === 'undefined' ? DEFAULT_SURFACE_HEIGHT : window.innerHeight;
  const containerWidth = resolveDimension(
    containerRect?.width ?? 0,
    container?.clientWidth ?? 0,
    viewportWidth
  );
  const containerHeight = resolveDimension(
    containerRect?.height ?? 0,
    container?.clientHeight ?? 0,
    viewportHeight
  );
  const availableWidth = Math.max(0, containerWidth - CANVAS_NODE_WORKBENCH_INSET * 2);
  const availableHeight = Math.max(0, containerHeight - CANVAS_NODE_WORKBENCH_INSET * 2);

  return {
    containerWidth,
    containerHeight,
    surfaceWidth: Math.min(
      resolveDimension(surfaceRect?.width ?? 0, surface?.offsetWidth ?? 0, DEFAULT_SURFACE_WIDTH),
      availableWidth
    ),
    surfaceHeight: Math.min(
      resolveDimension(
        surfaceRect?.height ?? 0,
        surface?.offsetHeight ?? 0,
        DEFAULT_SURFACE_HEIGHT
      ),
      availableHeight
    ),
  };
}

function resolveKeyboardDelta(
  event: KeyboardEvent<HTMLDivElement>
): Readonly<{ x: number; y: number }> | null {
  const step = event.shiftKey ? KEYBOARD_MOVE_LARGE_STEP : KEYBOARD_MOVE_STEP;

  switch (event.key) {
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

function preservePositionReference(
  current: CanvasNodeWorkbenchPosition,
  next: CanvasNodeWorkbenchPosition
): CanvasNodeWorkbenchPosition {
  return current.left === next.left && current.top === next.top ? current : next;
}

export function useCanvasNodeWorkbenchPosition(
  enabled: boolean
): CanvasNodeWorkbenchPositionController {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<CanvasNodeWorkbenchDragState | null>(null);
  const positionedRef = useRef(false);
  const [position, setPosition] = useState<CanvasNodeWorkbenchPosition>({
    left: CANVAS_NODE_WORKBENCH_INSET,
    top: CANVAS_NODE_WORKBENCH_DEFAULT_TOP,
  });

  useLayoutEffect(() => {
    if (!enabled) {
      dragStateRef.current = null;
      return;
    }

    const reconcilePosition = (): void => {
      const bounds = readWorkbenchBounds(surfaceRef.current);
      setPosition((current) => {
        if (!positionedRef.current) {
          positionedRef.current = true;
          return resolveDefaultCanvasNodeWorkbenchPosition(bounds);
        }
        return preservePositionReference(
          current,
          clampCanvasNodeWorkbenchPosition(current, bounds)
        );
      });
    };

    reconcilePosition();
    window.addEventListener('resize', reconcilePosition);
    const resizeObserver =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(reconcilePosition);
    const surface = surfaceRef.current;
    const container =
      surface?.offsetParent instanceof HTMLElement ? surface.offsetParent : surface?.parentElement;
    if (surface != null) {
      resizeObserver?.observe(surface);
    }
    if (container != null) {
      resizeObserver?.observe(container);
    }

    return () => {
      window.removeEventListener('resize', reconcilePosition);
      resizeObserver?.disconnect();
    };
  }, [enabled]);

  const handlePointerDown = useCallback<
    NonNullable<HTMLAttributes<HTMLDivElement>['onPointerDown']>
  >(
    (event) => {
      if (event.button !== 0) {
        return;
      }

      event.preventDefault();
      event.currentTarget.setPointerCapture?.(event.pointerId);
      dragStateRef.current = {
        pointerId: event.pointerId,
        origin: position,
        startX: event.clientX,
        startY: event.clientY,
      };
    },
    [position]
  );

  const handlePointerMove = useCallback<
    NonNullable<HTMLAttributes<HTMLDivElement>['onPointerMove']>
  >((event) => {
    const dragState = dragStateRef.current;
    if (dragState == null || dragState.pointerId !== event.pointerId) {
      return;
    }

    setPosition(
      moveCanvasNodeWorkbenchPosition(
        dragState.origin,
        {
          x: event.clientX - dragState.startX,
          y: event.clientY - dragState.startY,
        },
        readWorkbenchBounds(surfaceRef.current)
      )
    );
  }, []);

  const handlePointerEnd = useCallback<NonNullable<HTMLAttributes<HTMLDivElement>['onPointerUp']>>(
    (event) => {
      if (dragStateRef.current?.pointerId === event.pointerId) {
        dragStateRef.current = null;
      }
    },
    []
  );

  const handleKeyDown = useCallback<NonNullable<HTMLAttributes<HTMLDivElement>['onKeyDown']>>(
    (event) => {
      const delta = resolveKeyboardDelta(event);
      if (delta == null) {
        return;
      }

      event.preventDefault();
      setPosition((current) =>
        preservePositionReference(
          current,
          moveCanvasNodeWorkbenchPosition(current, delta, readWorkbenchBounds(surfaceRef.current))
        )
      );
    },
    []
  );

  return {
    dragHandleProps: {
      onKeyDown: handleKeyDown,
      onPointerDown: handlePointerDown,
    },
    position,
    surfacePointerProps: {
      onPointerCancel: handlePointerEnd,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerEnd,
    },
    surfaceRef,
  };
}
