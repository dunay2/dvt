/** Transfer focus into Canvas contextual editors and restore their opener. */
import { useCallback, useLayoutEffect, useRef, type FocusEvent } from 'react';
import { findCanvasGraphNodeElement } from './canvasNodeWorkbenchDomGeometry';

type WorkbenchOpener = Readonly<{
  element: HTMLElement | null;
  fallbackSelector?: string;
  fallbackNodeId?: string;
}>;

export function useCanvasWorkbenchFocus() {
  const openerRef = useRef<WorkbenchOpener | null>(null);
  const capture = useCallback((fallbackSelector?: string, fallbackNodeId?: string) => {
    openerRef.current = {
      element: document.activeElement instanceof HTMLElement ? document.activeElement : null,
      fallbackSelector,
      fallbackNodeId,
    };
  }, []);
  const enter = useCallback((selector: string) => {
    const previous = document.activeElement;
    window.requestAnimationFrame(() => {
      if (document.activeElement !== previous && document.activeElement !== document.body) return;
      document.querySelector<HTMLElement>(selector)?.focus({ preventScroll: true });
    });
  }, []);
  const restore = useCallback(() => {
    const opener = openerRef.current;
    openerRef.current = null;
    window.requestAnimationFrame(() => {
      const target =
        opener?.element?.isConnected === true
          ? opener.element
          : (findCanvasGraphNodeElement(opener?.fallbackNodeId ?? null) ??
            (opener?.fallbackSelector == null
              ? null
              : document.querySelector<HTMLElement>(opener.fallbackSelector)));
      target?.focus({ preventScroll: true });
    });
  }, []);
  return { capture, enter, restore };
}

/** Recover only focus lost to a removed control, including the portalled session footer. */
export function useCanvasWorkbenchFocusRecovery() {
  const ref = useRef<HTMLDivElement>(null);
  const focused = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (
      focused.current == null ||
      focused.current.isConnected ||
      document.activeElement !== document.body
    )
      return;
    const scope = ref.current;
    if (scope == null || scope.closest('[inert]') != null) return;
    const target =
      scope.querySelector<HTMLElement>('[role="treeitem"][aria-selected="true"]') ?? scope;
    target.focus({ preventScroll: true });
  });
  return {
    ref,
    onFocusCapture: (event: FocusEvent<HTMLDivElement>) => {
      focused.current = event.target;
    },
  };
}
