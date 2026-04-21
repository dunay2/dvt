import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../architecture.test.support';

const GRAPH_CHANGE_HANDLERS_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'useCanvasGraphChangeHandlers.ts'
);

describe('useCanvasGraphChangeHandlers architecture', () => {
  it('stays as a composition seam over node and edge handlers', () => {
    expect(GRAPH_CHANGE_HANDLERS_SOURCE).toContain('useCanvasNodeChangeHandlers');
    expect(GRAPH_CHANGE_HANDLERS_SOURCE).toContain('useCanvasEdgeChangeHandlers');
    expect(GRAPH_CHANGE_HANDLERS_SOURCE).not.toContain('useCanvasExplicitNodeAdmission');
    expect(GRAPH_CHANGE_HANDLERS_SOURCE).not.toContain('useCallback(');
    expect(GRAPH_CHANGE_HANDLERS_SOURCE).not.toContain('applyNodeChanges');
    expect(GRAPH_CHANGE_HANDLERS_SOURCE).not.toContain('applyEdgeChanges');
  });
});
