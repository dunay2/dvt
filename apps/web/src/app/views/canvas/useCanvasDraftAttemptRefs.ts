import { useCallback, useEffect, useRef } from 'react';

import type { DraftAttemptRefs } from './canvasDraftLifecycle.types';
import { clearSaveDebounce, createDraftAttemptRefs } from './canvasDraftPersistenceRuntime';

export function useCanvasDraftAttemptRefs() {
  const refsContainer = useRef<DraftAttemptRefs | null>(null);
  if (refsContainer.current == null) refsContainer.current = createDraftAttemptRefs();
  const refs = refsContainer.current;
  const invalidateInFlightSaveAttempt = useCallback(() => {
    refs.saveAttemptGenerationRef.current += 1;
    refs.activeSaveAttemptRef.current?.settleStale();
    refs.activeSaveAttemptRef.current = null;
    refs.confirmedSaveReceiptRef.current = null;
    clearSaveDebounce(refs);
  }, [refs]);
  useEffect(() => invalidateInFlightSaveAttempt, [invalidateInFlightSaveAttempt]);

  return {
    refs,
    invalidateInFlightSaveAttempt,
  };
}
