import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../architecture.test.support';

const PERSISTENCE_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'useCanvasDraftPersistence.ts'
);

describe('useCanvasDraftPersistence architecture', () => {
  it('stays as a composition seam over autosave and recovery sub-hooks', () => {
    expect(PERSISTENCE_SOURCE).toContain('useCanvasDraftAutosave');
    expect(PERSISTENCE_SOURCE).toContain('useCanvasDraftRecoveryActions');
    expect(PERSISTENCE_SOURCE).not.toContain('useEffect(');
  });
});
