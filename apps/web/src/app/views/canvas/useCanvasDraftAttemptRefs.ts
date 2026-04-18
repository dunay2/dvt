import { useCallback, useMemo, useRef } from 'react';

import type { DraftAttemptRefs } from './canvasDraftLifecycle.types';

export function useCanvasDraftAttemptRefs() {
  const saveDebounceTimerRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);
  const lastSavedSignatureRef = useRef<string | null>(null);
  const saveAttemptGenerationRef = useRef(0);
  const nextSaveAttemptIdRef = useRef(0);
  const activeSaveAttemptRef = useRef<{ id: number; generation: number } | null>(null);
  const refs = useMemo<DraftAttemptRefs>(
    () => ({
      saveDebounceTimerRef,
      lastSavedSignatureRef,
      saveAttemptGenerationRef,
      nextSaveAttemptIdRef,
      activeSaveAttemptRef,
    }),
    []
  );
  const invalidateInFlightSaveAttempt = useCallback(() => {
    saveAttemptGenerationRef.current += 1;
    activeSaveAttemptRef.current = null;
  }, []);

  return {
    refs,
    invalidateInFlightSaveAttempt,
  };
}
