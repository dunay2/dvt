import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../architecture.test.support';

const EDGE_AUTHORING_HANDLERS_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'useCanvasEdgeAuthoringHandlers.ts'
);
const EDGE_COMMAND_RUNNER_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'useCanvasEdgeCommandRunner.ts'
);
const COLUMN_AUTHORING_COMMAND_RUNNER_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'useCanvasColumnAuthoringCommandRunner.ts'
);

describe('useCanvasEdgeAuthoringHandlers architecture', () => {
  it('depends on local semantic contracts instead of the parent graph-handlers args', () => {
    expect(EDGE_AUTHORING_HANDLERS_SOURCE).toContain('CanvasEdgeAuthoringContracts');
    expect(EDGE_AUTHORING_HANDLERS_SOURCE).not.toContain('Pick<');
    expect(EDGE_AUTHORING_HANDLERS_SOURCE).not.toContain('UseCanvasGraphHandlersParams');
    expect(EDGE_AUTHORING_HANDLERS_SOURCE).not.toContain('UseCanvasGraphHandlersResult');
  });

  it('delegates edge and column authoring through their command runners', () => {
    expect(EDGE_AUTHORING_HANDLERS_SOURCE).toContain('useCanvasEdgeCommandRunner');
    expect(EDGE_AUTHORING_HANDLERS_SOURCE).toContain('resolveVisibleDraftPluginPortMap');
    expect(EDGE_AUTHORING_HANDLERS_SOURCE).toContain('getPluginPortMap(args.runtimeCapabilities)');
    expect(EDGE_AUTHORING_HANDLERS_SOURCE).toContain('state.canonicalNodesById');
    expect(EDGE_AUTHORING_HANDLERS_SOURCE).not.toContain('setEdges((existingEdges)');
    expect(EDGE_AUTHORING_HANDLERS_SOURCE).not.toContain('setDraftSession((currentSession)');
    expect(EDGE_AUTHORING_HANDLERS_SOURCE).toContain('CanvasColumnAuthoringCommandRunner');
    expect(COLUMN_AUTHORING_COMMAND_RUNNER_SOURCE).toContain('runDraftSessionCommand');
    expect(COLUMN_AUTHORING_COMMAND_RUNNER_SOURCE).not.toContain('setDraftSession(');
    expect(EDGE_COMMAND_RUNNER_SOURCE).toContain('resolveCanvasEdgeCreationTransaction');
    expect(EDGE_COMMAND_RUNNER_SOURCE).toContain('resolveCanvasEdgeReconnectTransaction');
    expect(EDGE_COMMAND_RUNNER_SOURCE).toContain('setEdges(args.transaction.edges)');
    expect(EDGE_COMMAND_RUNNER_SOURCE).toContain('canvasGraphLifecycle.edge.replaceVisible');
    expect(EDGE_COMMAND_RUNNER_SOURCE).toContain(
      'latestDraftSessionRef.current = nextDraftSession'
    );
  });
});
