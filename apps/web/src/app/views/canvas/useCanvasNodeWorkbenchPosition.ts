/** Owned concern: adapt pointer, keyboard, and viewport geometry to the workbench position model. */
import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type RefObject,
} from 'react';

import { readCanvasNodeWorkbenchGeometry } from './canvasNodeWorkbenchDomGeometry';
import {
  CANVAS_NODE_WORKBENCH_DEFAULT_TOP,
  CANVAS_NODE_WORKBENCH_INSET,
  clampCanvasNodeWorkbenchPosition,
  moveCanvasNodeWorkbenchPosition,
  preserveCanvasNodeWorkbenchPositionReference,
  resolveAnchoredCanvasNodeWorkbenchPosition,
  resolveCanvasNodeWorkbenchKeyboardDelta,
  resolveDefaultCanvasNodeWorkbenchPosition,
  type CanvasNodeWorkbenchPosition,
} from './canvasNodeWorkbenchPositionModel';

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

function captureActivePointer(element: HTMLDivElement, pointerId: number): void {
  if (element.setPointerCapture == null) {
    return;
  }

  try {
    element.setPointerCapture(pointerId);
  } catch (error) {
    if (!(error instanceof DOMException) || error.name !== 'NotFoundError') {
      throw error;
    }
  }
}

export function useCanvasNodeWorkbenchPosition(
  enabled: boolean,
  anchorNodeId: string | null = null
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
      positionedRef.current = false;
      return;
    }

    positionedRef.current = false;

    const reconcilePosition = (): void => {
      const geometry = readCanvasNodeWorkbenchGeometry(surfaceRef.current, anchorNodeId);
      setPosition((current) => {
        if (!positionedRef.current) {
          positionedRef.current = true;
          return geometry.anchor == null
            ? resolveDefaultCanvasNodeWorkbenchPosition(geometry.bounds)
            : resolveAnchoredCanvasNodeWorkbenchPosition(geometry.anchor, geometry.bounds);
        }
        return preserveCanvasNodeWorkbenchPositionReference(
          current,
          clampCanvasNodeWorkbenchPosition(current, geometry.bounds)
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
  }, [anchorNodeId, enabled]);

  const handlePointerDown = useCallback<
    NonNullable<HTMLAttributes<HTMLDivElement>['onPointerDown']>
  >(
    (event) => {
      if (event.button !== 0) {
        return;
      }

      event.preventDefault();
      captureActivePointer(event.currentTarget, event.pointerId);
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
  >(
    (event) => {
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
          readCanvasNodeWorkbenchGeometry(surfaceRef.current, anchorNodeId).bounds
        )
      );
    },
    [anchorNodeId]
  );

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
      const delta = resolveCanvasNodeWorkbenchKeyboardDelta(event.key, event.shiftKey);
      if (delta == null) {
        return;
      }

      event.preventDefault();
      setPosition((current) =>
        preserveCanvasNodeWorkbenchPositionReference(
          current,
          moveCanvasNodeWorkbenchPosition(
            current,
            delta,
            readCanvasNodeWorkbenchGeometry(surfaceRef.current, anchorNodeId).bounds
          )
        )
      );
    },
    [anchorNodeId]
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
