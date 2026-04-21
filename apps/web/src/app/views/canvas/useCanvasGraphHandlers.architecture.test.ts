import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../architecture.test.support';

const GRAPH_HANDLERS_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'useCanvasGraphHandlers.ts'
);

describe('useCanvasGraphHandlers architecture', () => {
  it('stays as a composition seam over the graph interaction capabilities', () => {
    expect(GRAPH_HANDLERS_SOURCE).toContain('useCanvasEdgeAuthoringHandlers');
    expect(GRAPH_HANDLERS_SOURCE).toContain('useCanvasSelectionHandlers');
    expect(GRAPH_HANDLERS_SOURCE).toContain('useCanvasLayoutHandlers');
    expect(GRAPH_HANDLERS_SOURCE).toContain('useCanvasNodeAuthoringHandlers');
    expect(GRAPH_HANDLERS_SOURCE).toContain('buildCanvasEdgeAuthoringContracts');
    expect(GRAPH_HANDLERS_SOURCE).toContain('buildCanvasSelectionContracts');
    expect(GRAPH_HANDLERS_SOURCE).toContain('buildCanvasLayoutContracts');
    expect(GRAPH_HANDLERS_SOURCE).toContain('buildCanvasNodeAuthoringContracts');
    expect(GRAPH_HANDLERS_SOURCE).toContain('interactionState');
    expect(GRAPH_HANDLERS_SOURCE).toContain('interactionEffects');
    expect(GRAPH_HANDLERS_SOURCE).toContain('interactionPolicy');
    expect(GRAPH_HANDLERS_SOURCE).toContain('interactionContracts');
    expect(GRAPH_HANDLERS_SOURCE).not.toContain('useCallback(');
    expect(GRAPH_HANDLERS_SOURCE).not.toContain('useMemo(');
    expect(GRAPH_HANDLERS_SOURCE).not.toContain('useRef(');
    expect(GRAPH_HANDLERS_SOURCE).not.toContain('useState(');
    expect(GRAPH_HANDLERS_SOURCE).not.toContain('toast.');
  });
});
