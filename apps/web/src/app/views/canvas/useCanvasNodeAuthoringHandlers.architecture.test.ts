import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../architecture.test.support';

const NODE_AUTHORING_HANDLERS_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'useCanvasNodeAuthoringHandlers.ts'
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
