/** Capture and restore the opener shared by Canvas contextual editors. */
import { useCallback, useRef } from 'react';
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
  return { capture, restore };
}
