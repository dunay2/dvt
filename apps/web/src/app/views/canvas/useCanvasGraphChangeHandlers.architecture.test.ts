import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const GRAPH_CHANGE_HANDLERS_SOURCE = readFileSync(
  path.resolve(import.meta.dirname, 'useCanvasGraphChangeHandlers.ts'),
  'utf8'
);

describe('useCanvasGraphChangeHandlers architecture', () => {
  it('stays as a composition seam over node, edge, and explicit-node handlers', () => {
    expect(GRAPH_CHANGE_HANDLERS_SOURCE).toContain('useCanvasNodeChangeHandlers');
    expect(GRAPH_CHANGE_HANDLERS_SOURCE).toContain('useCanvasEdgeChangeHandlers');
    expect(GRAPH_CHANGE_HANDLERS_SOURCE).toContain('useCanvasExplicitNodeAdmission');
    expect(GRAPH_CHANGE_HANDLERS_SOURCE).not.toContain('useCallback(');
    expect(GRAPH_CHANGE_HANDLERS_SOURCE).not.toContain('applyNodeChanges');
    expect(GRAPH_CHANGE_HANDLERS_SOURCE).not.toContain('applyEdgeChanges');
  });
});
