import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../architecture.test.support';

const NODE_AUTHORING_HANDLERS_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'useCanvasNodeAuthoringHandlers.ts'
);

describe('useCanvasNodeAuthoringHandlers architecture', () => {
  it('stays as a composition seam over node creation, duplicate, drop, and removal handlers', () => {
    expect(NODE_AUTHORING_HANDLERS_SOURCE).toContain('useCanvasNodeDropHandlers');
    expect(NODE_AUTHORING_HANDLERS_SOURCE).toContain('useCanvasAuthoringNodeCreationHandlers');
    expect(NODE_AUTHORING_HANDLERS_SOURCE).toContain('useCanvasNodeDuplicateHandlers');
    expect(NODE_AUTHORING_HANDLERS_SOURCE).toContain('useCanvasNodeRemovalHandlers');
    expect(NODE_AUTHORING_HANDLERS_SOURCE).toContain('CanvasNodeAuthoringContracts');
    expect(NODE_AUTHORING_HANDLERS_SOURCE).toContain('nodeDropContracts');
    expect(NODE_AUTHORING_HANDLERS_SOURCE).toContain('nodeCreationContracts');
    expect(NODE_AUTHORING_HANDLERS_SOURCE).toContain('nodeDuplicateContracts');
    expect(NODE_AUTHORING_HANDLERS_SOURCE).toContain('nodeRemovalContracts');
    expect(NODE_AUTHORING_HANDLERS_SOURCE).not.toContain('useCallback(');
    expect(NODE_AUTHORING_HANDLERS_SOURCE).not.toContain('toast.');
    expect(NODE_AUTHORING_HANDLERS_SOURCE).not.toContain('setTimeout(');
    expect(NODE_AUTHORING_HANDLERS_SOURCE).not.toContain('admitCanonicalNodeToCanvas');
    expect(NODE_AUTHORING_HANDLERS_SOURCE).not.toContain('canvasInteractionCommands');
    expect(NODE_AUTHORING_HANDLERS_SOURCE).not.toContain('Pick<');
    expect(NODE_AUTHORING_HANDLERS_SOURCE).not.toContain('UseCanvasGraphHandlersParams');
    expect(NODE_AUTHORING_HANDLERS_SOURCE).not.toContain('UseCanvasGraphHandlersResult');
  });
});
