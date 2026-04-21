import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../architecture.test.support';

const CONTROLLER_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'useCanvasController.ts'
);

describe('useCanvasController architecture', () => {
  it('stays a composition facade over environment, runtime, read-model, and adapter seams', () => {
    expect(CONTROLLER_SOURCE).toContain('useCanvasControllerEnvironment');
    expect(CONTROLLER_SOURCE).toContain('useCanvasAuthoringRuntime');
    expect(CONTROLLER_SOURCE).toContain('useCanvasControllerReadModel');
    expect(CONTROLLER_SOURCE).toContain('buildCanvasControllerViewModel');
    expect(CONTROLLER_SOURCE).not.toContain('queryKeys.workspace.graphDraft');
    expect(CONTROLLER_SOURCE).not.toContain('useQuery(');
    expect(CONTROLLER_SOURCE).not.toContain('useQueryClient(');
    expect(CONTROLLER_SOURCE).not.toContain('createCanvasDraftRepository');
    expect(CONTROLLER_SOURCE).not.toContain('createCanvasDraftQueryCache');
  });
});
