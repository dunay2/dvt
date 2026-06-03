import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../architecture.test.support';

const EDGE_CHANGE_HANDLERS_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'useCanvasEdgeChangeHandlers.ts'
);

describe('useCanvasEdgeChangeHandlers architecture', () => {
  it('delegates edge lifecycle semantics to the graph lifecycle component', () => {
    expect(EDGE_CHANGE_HANDLERS_SOURCE).toContain('canvasGraphLifecycle.edge.applyChanges');
    expect(EDGE_CHANGE_HANDLERS_SOURCE).toContain('CanvasEdgeChangeContracts');
    expect(EDGE_CHANGE_HANDLERS_SOURCE).not.toContain('Pick<');
    expect(EDGE_CHANGE_HANDLERS_SOURCE).not.toContain('applyEdgeChanges(');
    expect(EDGE_CHANGE_HANDLERS_SOURCE).not.toContain('replaceCanvasVisibleEdges');
    expect(EDGE_CHANGE_HANDLERS_SOURCE).not.toContain('UseCanvasMutationHandlersArgs');
    expect(EDGE_CHANGE_HANDLERS_SOURCE).not.toContain('CanvasGraphChangeHandlers');
  });
});
