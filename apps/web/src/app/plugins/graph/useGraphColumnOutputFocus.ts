/** Owned concern: keep output-toggle focus through an owned disclosure restore, not later input. */
import { useEffect, useRef } from 'react';

export function useGraphColumnOutputFocus() {
  const previousFocus = useRef<Element | null>(null);
  const pending = useRef<(() => void) | null>(null);
  useEffect(() => () => pending.current?.(), []);

  function capturePointerFocus(control: HTMLButtonElement): void {
    previousFocus.current = control.ownerDocument.activeElement;
  }

  function retainFocus(control: HTMLButtonElement): void {
    pending.current?.();
    const document = control.ownerDocument;
    const window = document.defaultView;
    const previous = previousFocus.current;
    previousFocus.current = null;
    const disclosure = control
      .closest('[data-slot="graph-node-column-section"]')
      ?.querySelector('[data-slot="graph-node-column-toggle"]');
    control.focus({ preventScroll: true });
    if (window == null) return;
    let cancelled = false;
    const clear = () => {
      window.removeEventListener('pointerdown', cancel, true);
      window.removeEventListener('keydown', cancel, true);
      pending.current = null;
    };
    const cancel = () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      clear();
    };
    const frame = window.requestAnimationFrame(() => {
      if (cancelled) return;
      clear();
      const active = document.activeElement;
      if (
        control.isConnected &&
        (active === control || active === previous || active === disclosure)
      ) {
        control.focus({ preventScroll: true });
      }
    });
    pending.current = cancel;
    window.addEventListener('pointerdown', cancel, true);
    window.addEventListener('keydown', cancel, true);
  }
  return { capturePointerFocus, retainFocus };
}
