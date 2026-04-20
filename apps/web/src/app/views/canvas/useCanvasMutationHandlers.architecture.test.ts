import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../architecture.test.support';

const MUTATION_HANDLERS_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'useCanvasMutationHandlers.ts'
);

describe('useCanvasMutationHandlers architecture', () => {
  it('stays as a composition seam over graph-change and source-import hooks', () => {
    expect(MUTATION_HANDLERS_SOURCE).toContain('useCanvasGraphChangeHandlers');
    expect(MUTATION_HANDLERS_SOURCE).toContain('useCanvasSourceImportHandlers');
    expect(MUTATION_HANDLERS_SOURCE).not.toContain('useState(');
    expect(MUTATION_HANDLERS_SOURCE).not.toContain('useQueryClient(');
    expect(MUTATION_HANDLERS_SOURCE).not.toContain('useCallback(');
  });
});
