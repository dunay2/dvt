import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const MUTATION_HANDLERS_SOURCE = readFileSync(
  path.resolve(import.meta.dirname, 'useCanvasMutationHandlers.ts'),
  'utf8'
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
