import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const BOOTSTRAPPING_SOURCE = readFileSync(
  path.resolve(import.meta.dirname, 'useCanvasDraftBootstrapping.ts'),
  'utf8'
);

describe('useCanvasDraftBootstrapping architecture', () => {
  it('stays as a composition seam over initial bootstrap and missing-remote sync', () => {
    expect(BOOTSTRAPPING_SOURCE).toContain('useCanvasDraftInitialBootstrap');
    expect(BOOTSTRAPPING_SOURCE).toContain('useCanvasDraftMissingRemoteSync');
    expect(BOOTSTRAPPING_SOURCE).not.toContain('useEffect(');
    expect(BOOTSTRAPPING_SOURCE).not.toContain('bootstrapSession(');
    expect(BOOTSTRAPPING_SOURCE).not.toContain('markRemoteDraftMissing(');
  });
});
