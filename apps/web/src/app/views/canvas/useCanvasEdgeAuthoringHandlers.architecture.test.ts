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

describe('useCanvasEdgeAuthoringHandlers architecture', () => {
  it('depends on local semantic contracts instead of the parent graph-handlers args', () => {
    expect(EDGE_AUTHORING_HANDLERS_SOURCE).toContain('CanvasEdgeAuthoringContracts');
    expect(EDGE_AUTHORING_HANDLERS_SOURCE).not.toContain('Pick<');
    expect(EDGE_AUTHORING_HANDLERS_SOURCE).not.toContain('UseCanvasGraphHandlersParams');
    expect(EDGE_AUTHORING_HANDLERS_SOURCE).not.toContain('UseCanvasGraphHandlersResult');
  });

  it('stays as a composition seam over proposal, confirmation, and reconnect handlers', () => {
    expect(EDGE_AUTHORING_HANDLERS_SOURCE).toContain('useCanvasConnectionProposalHandler');
    expect(EDGE_AUTHORING_HANDLERS_SOURCE).toContain('useCanvasConnectionConfirmationHandler');
    expect(EDGE_AUTHORING_HANDLERS_SOURCE).toContain('useCanvasEdgeReconnectHandler');
  });

  it('routes edge confirmations and reconnects through a command runner instead of updater side effects', () => {
    expect(EDGE_AUTHORING_HANDLERS_SOURCE).toContain('useCanvasEdgeCommandRunner');
    expect(EDGE_AUTHORING_HANDLERS_SOURCE).toContain('getPluginPortMap(policy.runtimeCapabilities)');
    expect(EDGE_AUTHORING_HANDLERS_SOURCE).not.toContain('setEdges((existingEdges)');
    expect(EDGE_AUTHORING_HANDLERS_SOURCE).not.toContain('setDraftSession((currentSession)');
    expect(EDGE_AUTHORING_HANDLERS_SOURCE).not.toContain('confirmReconnect');
    expect(EDGE_COMMAND_RUNNER_SOURCE).toContain('resolveCanvasEdgeConfirmationTransaction');
    expect(EDGE_COMMAND_RUNNER_SOURCE).toContain('resolveCanvasEdgeReconnectTransaction');
    expect(EDGE_COMMAND_RUNNER_SOURCE).toContain('setEdges(args.transaction.edges)');
    expect(EDGE_COMMAND_RUNNER_SOURCE).toContain('setDraftSession(args.transaction.draftSession)');
  });
});
