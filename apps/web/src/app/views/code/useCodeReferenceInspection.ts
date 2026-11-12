/**
 * Owned concern: expose only current reference details and restore their invoking focus.
 * @decision Keep local-overlay and external-inspector handoff in one presentation lifecycle.
 * @consequence Reference changes clear stale details without authoring or execution effects.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CodeInlineReferenceDetail } from './codeInlineReferences';
import type { CodeInlineReferenceCopy } from './codeViewCopy';
import type { CodeInlineReferenceState } from './useCodeInlineReferences';

export function useCodeReferenceInspection(
  state: CodeInlineReferenceState,
  copy: CodeInlineReferenceCopy,
  onInspectReference?: (reference: CodeInlineReferenceDetail | undefined) => void
) {
  const [localReference, setLocalReference] = useState<CodeInlineReferenceDetail>();
  const opener = useRef<HTMLElement | null>(null);
  const inlineReferences = useMemo(
    () => (state.kind === 'ready' ? { ...state.references, copy } : undefined),
    [state, copy]
  );
  const clear = useCallback(() => {
    setLocalReference(undefined);
    onInspectReference?.(undefined);
  }, [onInspectReference]);
  useEffect(clear, [clear, state]);
  const inspect = useCallback(
    (id: string) => {
      if (state.kind !== 'ready') return;
      const reference = state.details.find((item) => item.id === id);
      if (reference == null) return;
      opener.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      if (onInspectReference != null) onInspectReference(reference);
      else setLocalReference(reference);
    },
    [state, onInspectReference]
  );
  const close = useCallback(() => {
    clear();
    if (opener.current?.isConnected) opener.current.focus();
  }, [clear]);
  return { inlineReferences, localReference, clear, inspect, close };
}
