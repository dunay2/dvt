import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../architecture.test.support';

const BOOTSTRAPPING_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'useCanvasDraftBootstrapping.ts'
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
