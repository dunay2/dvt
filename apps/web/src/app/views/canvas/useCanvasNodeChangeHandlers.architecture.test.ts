import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../architecture.test.support';

const NODE_CHANGE_HANDLERS_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'useCanvasNodeChangeHandlers.ts'
);

describe('useCanvasNodeChangeHandlers architecture', () => {
  it('delegates node lifecycle semantics to the graph lifecycle component', () => {
    expect(NODE_CHANGE_HANDLERS_SOURCE).toContain('canvasGraphLifecycle.node.applyChanges');
    expect(NODE_CHANGE_HANDLERS_SOURCE).toContain('CanvasNodeChangeContracts');
    expect(NODE_CHANGE_HANDLERS_SOURCE).not.toContain('onLayoutComplete');
    expect(NODE_CHANGE_HANDLERS_SOURCE).not.toContain('Pick<');
    expect(NODE_CHANGE_HANDLERS_SOURCE).not.toContain('applyNodeChanges(');
    expect(NODE_CHANGE_HANDLERS_SOURCE).not.toContain('removeNodeFromCanvasWorkingSet');
    expect(NODE_CHANGE_HANDLERS_SOURCE).not.toContain('workspaceGraphDraftAuthoringPort');
    expect(NODE_CHANGE_HANDLERS_SOURCE).not.toContain('UseCanvasMutationHandlersArgs');
    expect(NODE_CHANGE_HANDLERS_SOURCE).not.toContain('CanvasGraphChangeHandlers');
  });
});
