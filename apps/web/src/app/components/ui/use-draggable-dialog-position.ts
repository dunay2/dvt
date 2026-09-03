/** Owned concern: keep pointer-draggable dialogs reachable inside the viewport. */
import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type RefObject,
} from 'react';

const VIEWPORT_INSET = 16;

type DialogOffset = Readonly<{ x: number; y: number }>;

type DialogDragState = Readonly<{
  pointerId: number;
  origin: DialogOffset;
  startX: number;
  startY: number;
  bounds: DOMRect;
}>;

type DraggableDialogPosition = Readonly<{
  contentRef: RefObject<HTMLDivElement>;
  contentStyle: CSSProperties;
  dragHandleProps: Pick<
    Required<HTMLAttributes<HTMLDivElement>>,
    'onPointerCancel' | 'onPointerDown' | 'onPointerMove' | 'onPointerUp'
  >;
}>;

const CENTERED_OFFSET: DialogOffset = { x: 0, y: 0 };

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
}

function resolveOffset(origin: DialogOffset, delta: DialogOffset, bounds: DOMRect): DialogOffset {
  return {
    x: clamp(
      origin.x + delta.x,
      origin.x + VIEWPORT_INSET - bounds.left,
      origin.x + window.innerWidth - VIEWPORT_INSET - bounds.right
    ),
    y: clamp(
      origin.y + delta.y,
      origin.y + VIEWPORT_INSET - bounds.top,
      origin.y + window.innerHeight - VIEWPORT_INSET - bounds.bottom
    ),
  };
}

function capturePointer(element: HTMLDivElement, pointerId: number): void {
  try {
    element.setPointerCapture?.(pointerId);
  } catch (error) {
    if (!(error instanceof DOMException) || error.name !== 'NotFoundError') {
      throw error;
    }
  }
}

export function useDraggableDialogPosition(open: boolean): DraggableDialogPosition {
  const contentRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<DialogDragState | null>(null);
  const wasOpenRef = useRef(open);
  const [offset, setOffset] = useState<DialogOffset>(CENTERED_OFFSET);

  useLayoutEffect(() => {
    if (open && !wasOpenRef.current) {
      setOffset(CENTERED_OFFSET);
    }
    if (!open) {
      dragStateRef.current = null;
    }
    wasOpenRef.current = open;
  }, [open]);

  const handlePointerDown = useCallback<
    NonNullable<HTMLAttributes<HTMLDivElement>['onPointerDown']>
  >(
    (event) => {
      if (event.button !== 0 || contentRef.current == null) {
        return;
      }

      event.preventDefault();
      capturePointer(event.currentTarget, event.pointerId);
      dragStateRef.current = {
        pointerId: event.pointerId,
        origin: offset,
        startX: event.clientX,
        startY: event.clientY,
        bounds: contentRef.current.getBoundingClientRect(),
      };
    },
    [offset]
  );

  const handlePointerMove = useCallback<
    NonNullable<HTMLAttributes<HTMLDivElement>['onPointerMove']>
  >((event) => {
    const dragState = dragStateRef.current;
    if (dragState == null || dragState.pointerId !== event.pointerId) {
      return;
    }

    setOffset(
      resolveOffset(
        dragState.origin,
        {
          x: event.clientX - dragState.startX,
          y: event.clientY - dragState.startY,
        },
        dragState.bounds
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

  return {
    contentRef,
    contentStyle: {
      left: `calc(50% + ${offset.x}px)`,
      top: `calc(50% + ${offset.y}px)`,
    },
    dragHandleProps: {
      onPointerCancel: handlePointerEnd,
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerEnd,
    },
  };
}
