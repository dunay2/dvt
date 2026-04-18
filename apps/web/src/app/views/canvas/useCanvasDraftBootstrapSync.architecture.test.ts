import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const BOOTSTRAP_SYNC_SOURCE = readFileSync(
  path.resolve(import.meta.dirname, 'useCanvasDraftBootstrapSync.ts'),
  'utf8'
);

describe('useCanvasDraftBootstrapSync architecture', () => {
  it('stays as a composition seam over narrower bootstrap policies', () => {
    expect(BOOTSTRAP_SYNC_SOURCE).toContain('useCanvasDraftReloadHydration');
    expect(BOOTSTRAP_SYNC_SOURCE).toContain('useCanvasDraftBootstrapping');
    expect(BOOTSTRAP_SYNC_SOURCE).toContain('useCanvasDraftCanonicalReconcile');
    expect(BOOTSTRAP_SYNC_SOURCE).not.toContain('useEffect(');
  });
});
