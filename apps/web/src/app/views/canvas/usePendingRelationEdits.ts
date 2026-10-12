/** Combine independent form drafts before allowing the owning model to apply or close. */
import { useCallback, useEffect, useRef } from 'react';

export function usePendingRelationEdits(onChange?: (pending: boolean) => void) {
  const drafts = useRef([false, false]);
  const callback = useRef(onChange);
  callback.current = onChange;
  const update = useCallback((index: number, pending: boolean) => {
    const wasPending = drafts.current.some(Boolean);
    drafts.current[index] = pending;
    const isPending = drafts.current.some(Boolean);
    if (isPending !== wasPending) callback.current?.(isPending);
  }, []);
  const setProperties = useCallback((pending: boolean) => update(0, pending), [update]);
  const setOutputs = useCallback((pending: boolean) => update(1, pending), [update]);
  useEffect(() => () => callback.current?.(false), []);
  return [setProperties, setOutputs] as const;
}
