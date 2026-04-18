import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const PERSISTENCE_SOURCE = readFileSync(
  path.resolve(import.meta.dirname, 'useCanvasDraftPersistence.ts'),
  'utf8'
);

describe('useCanvasDraftPersistence architecture', () => {
  it('stays as a composition seam over autosave and recovery sub-hooks', () => {
    expect(PERSISTENCE_SOURCE).toContain('useCanvasDraftAutosave');
    expect(PERSISTENCE_SOURCE).toContain('useCanvasDraftRecoveryActions');
    expect(PERSISTENCE_SOURCE).not.toContain('useEffect(');
  });
});
