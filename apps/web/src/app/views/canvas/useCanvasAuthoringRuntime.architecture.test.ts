import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../architecture.test.support';

const AUTHORING_RUNTIME_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'useCanvasAuthoringRuntime.ts'
);

describe('useCanvasAuthoringRuntime architecture', () => {
  it('stays an application seam over draft-flow composition plus pure policies', () => {
    expect(AUTHORING_RUNTIME_SOURCE).toContain(
      'Owned concern: compose backend posture, draft-flow composition, and authoring state'
    );
    expect(AUTHORING_RUNTIME_SOURCE).toContain("from './canvasAuthoringRuntime.types'");
    expect(AUTHORING_RUNTIME_SOURCE).toContain('useCanvasAuthoringRuntimeDraftFlow');
    expect(AUTHORING_RUNTIME_SOURCE).toContain('deriveCanvasBackendPosture');
    expect(AUTHORING_RUNTIME_SOURCE).toContain('deriveCanvasAuthoringState');
    expect(AUTHORING_RUNTIME_SOURCE).not.toContain('useCanvasDraftBaseline');
    expect(AUTHORING_RUNTIME_SOURCE).not.toContain('useCanvasAuthoringProjection');
    expect(AUTHORING_RUNTIME_SOURCE).not.toContain('useCanvasDraftLifecycle');
    expect(AUTHORING_RUNTIME_SOURCE).not.toContain('useQuery(');
    expect(AUTHORING_RUNTIME_SOURCE).not.toContain('useQueryClient(');
    expect(AUTHORING_RUNTIME_SOURCE).not.toContain('useState(');
    expect(AUTHORING_RUNTIME_SOURCE).not.toContain('createCanvasDraftRepository');
    expect(AUTHORING_RUNTIME_SOURCE).not.toContain('buildCanvasCanonicalSnapshot');
    expect(AUTHORING_RUNTIME_SOURCE).not.toContain('graphStrategy');
  });
});
