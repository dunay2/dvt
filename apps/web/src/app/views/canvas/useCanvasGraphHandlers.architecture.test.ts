import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const GRAPH_HANDLERS_SOURCE = readFileSync(
  path.resolve(import.meta.dirname, 'useCanvasGraphHandlers.ts'),
  'utf8'
);

describe('useCanvasGraphHandlers architecture', () => {
  it('stays as a composition seam over the graph interaction capabilities', () => {
    expect(GRAPH_HANDLERS_SOURCE).toContain('useCanvasEdgeAuthoringHandlers');
    expect(GRAPH_HANDLERS_SOURCE).toContain('useCanvasSelectionHandlers');
    expect(GRAPH_HANDLERS_SOURCE).toContain('useCanvasLayoutHandlers');
    expect(GRAPH_HANDLERS_SOURCE).toContain('useCanvasNodeAuthoringHandlers');
    expect(GRAPH_HANDLERS_SOURCE).not.toContain('useCallback(');
    expect(GRAPH_HANDLERS_SOURCE).not.toContain('useMemo(');
    expect(GRAPH_HANDLERS_SOURCE).not.toContain('useRef(');
    expect(GRAPH_HANDLERS_SOURCE).not.toContain('useState(');
    expect(GRAPH_HANDLERS_SOURCE).not.toContain('toast.');
  });
});
