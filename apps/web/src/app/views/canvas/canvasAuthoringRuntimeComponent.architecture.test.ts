import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../architecture.test.support';

const RUNTIME_CONTRACT_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasAuthoringRuntime.types.ts'
);
const LIFECYCLE_TYPES_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasDraftLifecycle.types.ts'
);
const RUNTIME_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'useCanvasAuthoringRuntime.ts'
);
const DRAFT_FLOW_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'useCanvasAuthoringRuntimeDraftFlow.ts'
);
const BASELINE_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'useCanvasDraftBaseline.ts'
);
const LIFECYCLE_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'useCanvasDraftLifecycle.ts'
);
const AUTHORING_STATE_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasAuthoringState.ts'
);
const BACKEND_POSTURE_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasBackendPosture.ts'
);

describe('canvas authoring runtime component architecture', () => {
  it('keeps the runtime contract, draft-flow seam, baseline seam, and lifecycle seam explicitly separated', () => {
    expect(RUNTIME_CONTRACT_SOURCE).toContain(
      'Owned concern: define the public local contract for the Canvas authoring-runtime component.'
    );
    expect(RUNTIME_CONTRACT_SOURCE).toContain('export type UseCanvasAuthoringRuntimeArgs');
    expect(RUNTIME_CONTRACT_SOURCE).toContain(
      'export type UseCanvasAuthoringRuntimeDraftFlowArgs'
    );
    expect(LIFECYCLE_TYPES_SOURCE).toContain('export type CanvasDraftLifecycleDto');
    expect(LIFECYCLE_TYPES_SOURCE).toContain('export type CanvasCurrentDraftPayloadDto');

    expect(RUNTIME_SOURCE).toContain("from './canvasAuthoringRuntime.types'");
    expect(RUNTIME_SOURCE).toContain('deriveCanvasBackendPosture');
    expect(RUNTIME_SOURCE).toContain('deriveCanvasAuthoringState');
    expect(RUNTIME_SOURCE).not.toContain('useQuery(');
    expect(RUNTIME_SOURCE).not.toContain('useState(');

    expect(DRAFT_FLOW_SOURCE).toContain("from './canvasAuthoringRuntime.types'");
    expect(DRAFT_FLOW_SOURCE).not.toContain("from './useCanvasAuthoringRuntime'");
    expect(DRAFT_FLOW_SOURCE).toContain('useCanvasDraftBaseline');
    expect(DRAFT_FLOW_SOURCE).toContain('useCanvasAuthoringProjection');
    expect(DRAFT_FLOW_SOURCE).toContain('useCanvasDraftLifecycle');

    expect(BASELINE_SOURCE).toContain('createCanvasDraftRepository');
    expect(BASELINE_SOURCE).toContain('createCanvasDraftQueryCache');
    expect(BASELINE_SOURCE).toContain('useQuery(');
    expect(BASELINE_SOURCE).toContain('Owned concern: provide the Canvas authoring-runtime baseline');
    expect(BASELINE_SOURCE).not.toContain('deriveCanvasBackendPosture');

    expect(LIFECYCLE_SOURCE).toContain('useCanvasDraftBootstrapSync');
    expect(LIFECYCLE_SOURCE).toContain('useCanvasDraftPersistence');
    expect(LIFECYCLE_SOURCE).toContain('useCanvasCurrentDraftPayload({');
    expect(LIFECYCLE_SOURCE).toContain(
      'Owned concern: compose bootstrapping, persistence, save-attempt policy, and first-canvas creation'
    );
    expect(LIFECYCLE_SOURCE).not.toContain('useQuery(');

    expect(AUTHORING_STATE_SOURCE).toContain(
      'Owned concern: derive route-safe Canvas authoring scopes'
    );
    expect(BACKEND_POSTURE_SOURCE).toContain(
      'Owned concern: derive backend readiness and transport-mutation posture'
    );
  });
});
