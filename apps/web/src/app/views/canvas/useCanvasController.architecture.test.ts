import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const CONTROLLER_SOURCE = readFileSync(
  path.resolve(import.meta.dirname, 'useCanvasController.ts'),
  'utf8'
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
