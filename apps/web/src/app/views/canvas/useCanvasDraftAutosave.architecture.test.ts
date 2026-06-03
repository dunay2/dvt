import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../architecture.test.support';

const AUTOSAVE_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'useCanvasDraftAutosave.ts'
);

describe('useCanvasDraftAutosave architecture', () => {
  it('stays as a scheduling seam over pure save-flow execution', () => {
    expect(AUTOSAVE_SOURCE).toContain('useEffect(');
    expect(AUTOSAVE_SOURCE).toContain('runCanvasDraftAutosaveEffect');
    expect(AUTOSAVE_SOURCE).not.toContain('.saveGraphDraft(');
    expect(AUTOSAVE_SOURCE).not.toContain('resolveDraftSaveSuccess');
    expect(AUTOSAVE_SOURCE).not.toContain('resolveDraftSaveFailure');
  });
});
