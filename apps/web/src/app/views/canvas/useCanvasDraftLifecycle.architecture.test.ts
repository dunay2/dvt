import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const LIFECYCLE_SOURCE = readFileSync(
  path.resolve(import.meta.dirname, 'useCanvasDraftLifecycle.ts'),
  'utf8'
);

describe('useCanvasDraftLifecycle architecture', () => {
  it('composes narrower bootstrap and persistence seams instead of owning large effects inline', () => {
    expect(LIFECYCLE_SOURCE).toContain('useCanvasDraftBootstrapSync');
    expect(LIFECYCLE_SOURCE).toContain('useCanvasDraftPersistence');
    expect(LIFECYCLE_SOURCE).toContain('useCanvasCurrentDraftPayload');
    expect(LIFECYCLE_SOURCE).toContain('useCanvasDraftAttemptRefs');
    expect(LIFECYCLE_SOURCE).not.toContain('useEffect(');
    expect(LIFECYCLE_SOURCE).not.toContain('buildCanonicalSnapshotFromWorkspaceSnapshot');
    expect(LIFECYCLE_SOURCE).not.toContain('useRef(');
  });
});
