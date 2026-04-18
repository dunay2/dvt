import { describe, expect, it } from 'vitest';

import type { DraftAttemptRefs } from './canvasDraftLifecycle.types';
import { isStaleSaveResolution } from './canvasDraftPersistenceRuntime';

function createDraftAttemptRefs(): DraftAttemptRefs {
  return {
    saveDebounceTimerRef: { current: null },
    lastSavedSignatureRef: { current: null },
    saveAttemptGenerationRef: { current: 0 },
    nextSaveAttemptIdRef: { current: 0 },
    activeSaveAttemptRef: { current: null },
  };
}

describe('canvasDraftPersistenceRuntime', () => {
  it('treats a resolution as stale when the active save attempt was invalidated', () => {
    const refs = createDraftAttemptRefs();
    refs.saveAttemptGenerationRef.current = 2;

    expect(isStaleSaveResolution(refs, { id: 1, generation: 1 })).toBe(true);
  });

  it('keeps a matching active save attempt as current', () => {
    const refs = createDraftAttemptRefs();
    const saveAttempt = { id: 2, generation: 3 };
    refs.saveAttemptGenerationRef.current = saveAttempt.generation;
    refs.activeSaveAttemptRef.current = saveAttempt;

    expect(isStaleSaveResolution(refs, saveAttempt)).toBe(false);
  });
});
