import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../architecture.test.support';

const LIFECYCLE_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'useCanvasDraftLifecycle.ts'
);

describe('useCanvasDraftLifecycle architecture', () => {
  it('composes narrower bootstrap and persistence seams behind a semantic lifecycle DTO instead of a flat transport bag', () => {
    expect(LIFECYCLE_SOURCE).toContain('}: CanvasDraftLifecycleDto)');
    expect(LIFECYCLE_SOURCE).toContain('baseline,');
    expect(LIFECYCLE_SOURCE).toContain('session,');
    expect(LIFECYCLE_SOURCE).toContain('projection,');
    expect(LIFECYCLE_SOURCE).toContain('policy,');
    expect(LIFECYCLE_SOURCE).toContain('useCanvasDraftBootstrapSync');
    expect(LIFECYCLE_SOURCE).toContain('useCanvasDraftPersistence');
    expect(LIFECYCLE_SOURCE).toContain('useCanvasCurrentDraftPayload({');
    expect(LIFECYCLE_SOURCE).toContain('persistedNodePositions,');
    expect(LIFECYCLE_SOURCE).not.toContain('graphNodes,');
    expect(
      LIFECYCLE_SOURCE.match(/createDraftIdempotencyKey: createCanvasDraftIdempotencyKey/g)
    ).toHaveLength(2);
    expect(LIFECYCLE_SOURCE).not.toContain(
      'createDraftIdempotencyKey: () => createBrowserIdempotencyKey'
    );
    expect(LIFECYCLE_SOURCE).toContain('useCanvasDraftAttemptRefs');
    expect(LIFECYCLE_SOURCE).toContain('executeCreateCanvasDocumentCommand({');
    expect(LIFECYCLE_SOURCE).toContain('executeImportProjectSnapshotCommand({');
    expect(LIFECYCLE_SOURCE).not.toContain('UseCanvasDraftLifecycleArgs');
    expect(LIFECYCLE_SOURCE).not.toContain('useEffect(');
    expect(LIFECYCLE_SOURCE).not.toContain('buildCanonicalSnapshotFromWorkspaceSnapshot');
    expect(LIFECYCLE_SOURCE).not.toContain('useRef(');
    expect(LIFECYCLE_SOURCE).not.toContain('draftRepository.saveGraphDraft({');
  });
});
