import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../architecture.test.support';

const AUTHORING_RUNTIME_DRAFT_FLOW_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'useCanvasAuthoringRuntimeDraftFlow.ts'
);

describe('useCanvasAuthoringRuntimeDraftFlow architecture', () => {
  it('owns draft baseline, projection, lifecycle, and draft-session state', () => {
    expect(AUTHORING_RUNTIME_DRAFT_FLOW_SOURCE).toContain('useState(');
    expect(AUTHORING_RUNTIME_DRAFT_FLOW_SOURCE).toContain('useCanvasDraftBaseline');
    expect(AUTHORING_RUNTIME_DRAFT_FLOW_SOURCE).toContain('useCanvasAuthoringProjection');
    expect(AUTHORING_RUNTIME_DRAFT_FLOW_SOURCE).toContain('useCanvasDraftLifecycle');
    expect(AUTHORING_RUNTIME_DRAFT_FLOW_SOURCE).not.toContain('useQuery(');
    expect(AUTHORING_RUNTIME_DRAFT_FLOW_SOURCE).not.toContain('useQueryClient(');
    expect(AUTHORING_RUNTIME_DRAFT_FLOW_SOURCE).not.toContain('deriveCanvasBackendPosture');
    expect(AUTHORING_RUNTIME_DRAFT_FLOW_SOURCE).not.toContain('deriveCanvasAuthoringState');
  });
});
