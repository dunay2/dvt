import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const AUTOSAVE_SOURCE = readFileSync(
  path.resolve(import.meta.dirname, 'useCanvasDraftAutosave.ts'),
  'utf8'
);

describe('useCanvasDraftAutosave architecture', () => {
  it('stays as a scheduling seam over pure save-flow execution', () => {
    expect(AUTOSAVE_SOURCE).toContain('useEffect(');
    expect(AUTOSAVE_SOURCE).toContain('performCanvasDraftAutosave');
    expect(AUTOSAVE_SOURCE).not.toContain('.saveGraphDraft(');
    expect(AUTOSAVE_SOURCE).not.toContain('resolveDraftSaveSuccess');
    expect(AUTOSAVE_SOURCE).not.toContain('resolveDraftSaveFailure');
  });
});
