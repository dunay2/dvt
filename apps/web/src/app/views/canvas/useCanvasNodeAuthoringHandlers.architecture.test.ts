import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const NODE_AUTHORING_HANDLERS_SOURCE = readFileSync(
  path.resolve(import.meta.dirname, 'useCanvasNodeAuthoringHandlers.ts'),
  'utf8'
);

describe('useCanvasNodeAuthoringHandlers architecture', () => {
  it('stays as a composition seam over node drop and removal handlers', () => {
    expect(NODE_AUTHORING_HANDLERS_SOURCE).toContain('useCanvasNodeDropHandlers');
    expect(NODE_AUTHORING_HANDLERS_SOURCE).toContain('useCanvasNodeRemovalHandlers');
    expect(NODE_AUTHORING_HANDLERS_SOURCE).not.toContain('useCallback(');
    expect(NODE_AUTHORING_HANDLERS_SOURCE).not.toContain('toast.');
    expect(NODE_AUTHORING_HANDLERS_SOURCE).not.toContain('setTimeout(');
    expect(NODE_AUTHORING_HANDLERS_SOURCE).not.toContain('dropCanonicalNode');
    expect(NODE_AUTHORING_HANDLERS_SOURCE).not.toContain('removeNodeFromCanvasWorkingSet');
  });
});
