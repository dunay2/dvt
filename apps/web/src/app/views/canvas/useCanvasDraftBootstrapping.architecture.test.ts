import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../architecture.test.support';

const BOOTSTRAPPING_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'useCanvasDraftBootstrapping.ts'
);
const INITIAL_BOOTSTRAP_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'useCanvasDraftInitialBootstrap.ts'
);

describe('useCanvasDraftBootstrapping architecture', () => {
  it('stays as a composition seam over initial bootstrap and missing-remote sync', () => {
    expect(BOOTSTRAPPING_SOURCE).toContain('useCanvasDraftInitialBootstrap');
    expect(BOOTSTRAPPING_SOURCE).toContain('useCanvasDraftMissingRemoteSync');
    expect(BOOTSTRAPPING_SOURCE).not.toContain('useEffect(');
    expect(BOOTSTRAPPING_SOURCE).not.toContain('bootstrapSession(');
    expect(BOOTSTRAPPING_SOURCE).not.toContain('markRemoteDraftMissing(');
  });

  it('keeps the initial draft-session updater free of external side effects', () => {
    const updaterStart = INITIAL_BOOTSTRAP_SOURCE.indexOf('setDraftSession((currentSession)');
    expect(updaterStart).toBeGreaterThanOrEqual(0);

    const updaterSource = INITIAL_BOOTSTRAP_SOURCE.slice(updaterStart);

    expect(updaterSource).not.toContain('setCanvasNodePositions(');
    expect(updaterSource).not.toContain('setDraftSaveStatus(');
    expect(updaterSource).not.toContain('lastSavedSignatureRef.current =');
    expect(updaterSource).not.toContain('lastFailedSignatureRef.current =');
  });
});
