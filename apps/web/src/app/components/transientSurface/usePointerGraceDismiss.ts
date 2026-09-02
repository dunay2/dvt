/** Owned concern: share pointer-only grace dismissal across transient surfaces. */
import { useCallback, useEffect, useRef, type PointerEventHandler } from 'react';

const POINTER_GRACE_DISMISS_DELAY_MS = 1_000;

export function usePointerGraceDismiss(args: {
  enabled: boolean;
  onDismiss: () => void;
}): Readonly<{
  onPointerEnter: PointerEventHandler<HTMLElement>;
  onPointerLeave: PointerEventHandler<HTMLElement>;
}> {
  const dismissRef = useRef(args.onDismiss);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    dismissRef.current = args.onDismiss;
  }, [args.onDismiss]);

  const cancelPendingDismissal = useCallback(() => {
    if (timeoutRef.current != null) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }, []);

  const scheduleDismissal = useCallback(() => {
    if (!args.enabled) return;
    cancelPendingDismissal();
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      dismissRef.current();
    }, POINTER_GRACE_DISMISS_DELAY_MS);
  }, [args.enabled, cancelPendingDismissal]);

  useEffect(() => {
    if (args.enabled) scheduleDismissal();
    else cancelPendingDismissal();
    return cancelPendingDismissal;
  }, [args.enabled, cancelPendingDismissal, scheduleDismissal]);

  return {
    onPointerEnter: cancelPendingDismissal,
    onPointerLeave: scheduleDismissal,
  };
}
