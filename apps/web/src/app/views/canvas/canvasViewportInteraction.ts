/** Owned concern: share Canvas gesture admission and key-to-intent mapping. */
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';

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
        '[data-relational-card-id], [data-slot="canvas-relational-card"], .react-flow__node'
      )
    )
  );
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

  event.preventDefault();
  event.stopPropagation();
  const MouseEventConstructor =
    shell.ownerDocument.defaultView?.MouseEvent ?? globalThis.MouseEvent;
  shell.dispatchEvent(
    new MouseEventConstructor('dblclick', { bubbles: true, cancelable: true, detail: 2 })
  );
  return true;
}
