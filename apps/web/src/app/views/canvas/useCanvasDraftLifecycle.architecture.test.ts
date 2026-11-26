import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../architecture.test.support';

const LIFECYCLE_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'useCanvasDraftLifecycle.ts'
);
const CANVAS_COMMANDS_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'useCanvasProjectCanvasCommands.ts'
);
const SNAPSHOT_COMMANDS_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'useCanvasProjectSnapshotCommands.ts'
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
    expect(LIFECYCLE_SOURCE).toContain('useCanvasProjectCanvasCommands({');
    expect(LIFECYCLE_SOURCE).toContain('useCanvasProjectSnapshotCommands({');
    expect(CANVAS_COMMANDS_SOURCE).toContain('executeCreateCanvasDocumentCommand({');
    expect(CANVAS_COMMANDS_SOURCE).toContain('executeSelectCanvasDocumentCommand({');
    expect(SNAPSHOT_COMMANDS_SOURCE).toContain('executeImportProjectSnapshotCommand({');
    expect(LIFECYCLE_SOURCE).not.toContain('UseCanvasDraftLifecycleArgs');
    expect(LIFECYCLE_SOURCE).not.toContain('useEffect(');
    expect(LIFECYCLE_SOURCE).not.toContain('buildCanonicalSnapshotFromWorkspaceSnapshot');
    expect(LIFECYCLE_SOURCE).not.toContain('useRef(');
    expect(LIFECYCLE_SOURCE).not.toContain('draftRepository.saveGraphDraft({');
    expect(CANVAS_COMMANDS_SOURCE).not.toContain('draftRepository.saveGraphDraft(');
    expect(SNAPSHOT_COMMANDS_SOURCE).not.toContain('draftRepository.saveGraphDraft(');
  });
});
