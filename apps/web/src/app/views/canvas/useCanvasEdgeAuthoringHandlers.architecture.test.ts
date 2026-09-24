import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../architecture.test.support';

const EDGE_AUTHORING_HANDLERS_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'useCanvasEdgeAuthoringHandlers.ts'
);

describe('useCanvasEdgeAuthoringHandlers architecture', () => {
  it('depends on local semantic contracts instead of the parent graph-handlers args', () => {
    expect(EDGE_AUTHORING_HANDLERS_SOURCE).toContain('CanvasEdgeAuthoringContracts');
    expect(EDGE_AUTHORING_HANDLERS_SOURCE).not.toContain('Pick<');
    expect(EDGE_AUTHORING_HANDLERS_SOURCE).not.toContain('UseCanvasGraphHandlersParams');
    expect(EDGE_AUTHORING_HANDLERS_SOURCE).not.toContain('UseCanvasGraphHandlersResult');
  });
});
