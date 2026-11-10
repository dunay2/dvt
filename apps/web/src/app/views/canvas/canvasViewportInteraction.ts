/** Owned concern: share Canvas gesture admission and key-to-intent mapping. */
import { useRef, type KeyboardEvent as ReactKeyboardEvent, type PointerEventHandler } from 'react';

import {
  isCanvasElement,
  isCanvasNodeEmbeddedControlTarget,
} from '../../components/canvas/canvasNodeInteractionBoundary';

type CanvasKeyboardEvent = Pick<KeyboardEvent, 'key'> &
  Partial<Pick<KeyboardEvent, 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey' | 'repeat'>>;

const CANVAS_POINTER_OPTIONS = {
  panOnDrag: [0],
  panActivationKeyCode: null,
  selectionOnDrag: false,
  selectionKeyCode: null,
  multiSelectionKeyCode: 'Shift',
  selectNodesOnDrag: true,
};
const CANVAS_DELETE_KEYS = ['Backspace', 'Delete'];

export function resolveCanvasViewportInteraction(canDeleteWithKeyboard: boolean) {
  return {
    flow: {
      ...CANVAS_POINTER_OPTIONS,
      zoomOnDoubleClick: false,
      deleteKeyCode: canDeleteWithKeyboard ? CANVAS_DELETE_KEYS : null,
    },
    controls: { showInteractive: false },
  };
}

export function resolveCanvasKeyboardAction(
  event: CanvasKeyboardEvent
): 'activate' | 'search' | 'dismiss' | 'context-menu' | undefined {
  if (event.repeat) return undefined;
  if (event.key === 'Escape') return 'dismiss';
  if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'f') {
    return 'search';
  }
  if (event.ctrlKey || event.metaKey || event.altKey) return undefined;
  if (event.key === 'Enter') return 'activate';
  if (event.key === 'ContextMenu' || (event.key === 'F10' && event.shiftKey)) {
    return 'context-menu';
  }
  return undefined;
}

export function isCanvasTextEditingTarget(target: EventTarget | null): boolean {
  return (
    isCanvasElement(target) &&
    target.closest(
      'input, textarea, select, [role="textbox"], [contenteditable]:not([contenteditable="false"])'
    ) != null
  );
}

export function isCanvasInteractionControlTarget(target: EventTarget | null): boolean {
  return (
    isCanvasNodeEmbeddedControlTarget(target) ||
    isCanvasTextEditingTarget(target) ||
    (isCanvasElement(target) && target.closest('button, summary, a[href], [role="button"]') != null)
  );
}

export const canvasViewportScopeProps = { 'data-canvas-viewport': '' } as const;

export function isCanvasViewportTarget(
  target: EventTarget | null,
  boundary: EventTarget | null
): boolean {
  return (
    isCanvasElement(target) &&
    isCanvasElement(boundary) &&
    boundary.contains(target) &&
    (!boundary.matches('[data-canvas-viewport]') ||
      target.closest('[data-canvas-viewport]') === boundary)
  );
}

export function isCanvasBackgroundTarget(
  target: EventTarget | null,
  boundary: EventTarget | null
): boolean {
  return (
    isCanvasViewportTarget(target, boundary) &&
    isCanvasElement(target) &&
    isCanvasElement(boundary) &&
    !isCanvasInteractionControlTarget(target) &&
    !boundary.contains(
      target.closest(
        '[data-relational-card-id], [data-slot="canvas-relational-card"], .react-flow__node, .react-flow__edge, .react-flow__handle, .react-flow__controls, .react-flow__minimap, [role="menu"], [role="dialog"], [role="search"]'
      )
    )
  );
}

/** Admit Add only on the nearest canvas background; callers retain menu and command ownership. */
export function resolveCanvasBackgroundAddMenuRequest(
  event: Pick<
    MouseEvent,
    'button' | 'detail' | 'target' | 'currentTarget' | 'clientX' | 'clientY' | 'defaultPrevented'
  >
): { x: number; y: number } | undefined {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.detail !== 2 ||
    !isCanvasBackgroundTarget(event.target, event.currentTarget)
  )
    return undefined;
  return { x: event.clientX, y: event.clientY };
}

/** Keep drag/cancel history local to the owning viewport, shared by both renderers. */
export function useCanvasBackgroundAddMenuGesture() {
  const gesture = useRef<{ origin: { id: number; x: number; y: number } | null; moved: boolean }>({
    origin: null,
    moved: false,
  });
  const onPointerDownCapture: PointerEventHandler<HTMLDivElement> = (event) => {
    gesture.current = {
      moved: false,
      origin: canStartCanvasBackgroundPan(event)
        ? { id: event.pointerId, x: event.clientX, y: event.clientY }
        : null,
    };
  };
  const onPointerMoveCapture: PointerEventHandler<HTMLDivElement> = (event) => {
    const origin = gesture.current.origin;
    if (
      origin?.id === event.pointerId &&
      (origin.x !== event.clientX || origin.y !== event.clientY)
    )
      gesture.current.moved = true;
  };
  const onPointerUpCapture: PointerEventHandler<HTMLDivElement> = (event) => {
    if (gesture.current.origin?.id === event.pointerId) gesture.current.origin = null;
  };
  const onPointerCancelCapture: PointerEventHandler<HTMLDivElement> = (event) => {
    if (gesture.current.origin?.id !== event.pointerId) return;
    gesture.current = { origin: null, moved: true };
  };
  return {
    pointerHandlers: {
      onPointerDownCapture,
      onPointerMoveCapture,
      onPointerUpCapture,
      onPointerCancelCapture,
      onLostPointerCaptureCapture: onPointerCancelCapture,
    },
    resolveRequest: (event: Parameters<typeof resolveCanvasBackgroundAddMenuRequest>[0]) =>
      gesture.current.moved ? undefined : resolveCanvasBackgroundAddMenuRequest(event),
  };
}

export function consumeCanvasDragClick(
  event: Pick<MouseEvent, 'detail' | 'preventDefault' | 'stopPropagation'>,
  pending: { current: boolean },
  ownsTarget: boolean
): void {
  if (!pending.current || event.detail <= 0 || !ownsTarget) return;
  pending.current = false;
  event.preventDefault();
  event.stopPropagation();
}

export function canStartCanvasBackgroundPan(
  event: Pick<PointerEvent, 'button' | 'target' | 'currentTarget'>
): boolean {
  return (
    event.button === CANVAS_POINTER_OPTIONS.panOnDrag[0] &&
    isCanvasBackgroundTarget(event.target, event.currentTarget)
  );
}

export function activateFocusedCanvasNodeFromKeyboard(
  event: Pick<
    ReactKeyboardEvent<HTMLElement>,
    | 'key'
    | 'ctrlKey'
    | 'metaKey'
    | 'altKey'
    | 'shiftKey'
    | 'target'
    | 'preventDefault'
    | 'stopPropagation'
  >
): boolean {
  if (
    resolveCanvasKeyboardAction(event) !== 'activate' ||
    isCanvasInteractionControlTarget(event.target) ||
    !isCanvasElement(event.target)
  ) {
    return false;
  }
  const shell = event.target
    .closest('.react-flow__node')
    ?.querySelector<HTMLElement>('[data-slot="canvas-node-shell"]');
  if (shell == null) return false;
  const activation = shell.getAttribute('data-canvas-node-activation');
  if (activation !== 'open' && activation !== 'inspect') return false;

  event.preventDefault();
  event.stopPropagation();
  const MouseEventConstructor =
    shell.ownerDocument.defaultView?.MouseEvent ?? globalThis.MouseEvent;
  shell.dispatchEvent(
    new MouseEventConstructor(activation === 'open' ? 'dblclick' : 'click', {
      bubbles: true,
      cancelable: true,
      detail: activation === 'open' ? 2 : 0,
    })
  );
  return true;
}
