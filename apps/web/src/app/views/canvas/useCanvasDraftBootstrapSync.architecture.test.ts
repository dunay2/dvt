import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../architecture.test.support';

const BOOTSTRAP_SYNC_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'useCanvasDraftBootstrapSync.ts'
);

describe('useCanvasDraftBootstrapSync architecture', () => {
  it('stays as a composition seam over narrower bootstrap policies', () => {
    expect(BOOTSTRAP_SYNC_SOURCE).toContain('useCanvasDraftReloadHydration');
    expect(BOOTSTRAP_SYNC_SOURCE).toContain('useCanvasDraftBootstrapping');
    expect(BOOTSTRAP_SYNC_SOURCE).toContain('useCanvasDraftCanonicalReconcile');
    expect(BOOTSTRAP_SYNC_SOURCE).not.toContain('useEffect(');
  });
});
