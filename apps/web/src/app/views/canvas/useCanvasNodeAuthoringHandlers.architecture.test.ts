import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../architecture.test.support';

const NODE_AUTHORING_HANDLERS_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'useCanvasNodeAuthoringHandlers.ts'
);
const NODE_DROP_HANDLERS_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'useCanvasNodeDropHandlers.ts'
);
const AUTHORING_NODE_CREATION_HANDLERS_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'useCanvasAuthoringNodeCreationHandlers.ts'
);
const NODE_ADMISSION_COMMAND_RUNNER_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'useCanvasNodeAdmissionCommandRunner.ts'
);

describe('useCanvasNodeAuthoringHandlers architecture', () => {
  it('delegates screen coordinates to the viewport without reading nested target bounds', () => {
    expect(NODE_DROP_HANDLERS_SOURCE).toContain('useReactFlow');
    expect(NODE_DROP_HANDLERS_SOURCE).toContain('screenToFlowPosition(');
    expect(NODE_DROP_HANDLERS_SOURCE).toContain('snapToGrid: false');
    expect(NODE_DROP_HANDLERS_SOURCE).not.toContain('getBoundingClientRect');
    expect(NODE_DROP_HANDLERS_SOURCE).not.toContain('event.target');
    expect(NODE_ADMISSION_COMMAND_RUNNER_SOURCE).not.toContain('getBoundingClientRect');
    expect(NODE_ADMISSION_COMMAND_RUNNER_SOURCE).not.toContain('useReactFlow');
    expect(NODE_ADMISSION_COMMAND_RUNNER_SOURCE).not.toContain('screenToFlowPosition');
  });

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

  it('keeps node creation and drop React handlers outside state-updater side effects', () => {
    for (const source of [NODE_DROP_HANDLERS_SOURCE, AUTHORING_NODE_CREATION_HANDLERS_SOURCE]) {
      expect(source).toContain('useCanvasNodeAdmissionCommandRunner');
      expect(source).not.toContain('resolveCanvasNodeAdmissionTransaction');
      expect(source).not.toContain('setNodes((');
      expect(source).not.toContain('setDraftSession((');
    }

    expect(NODE_ADMISSION_COMMAND_RUNNER_SOURCE).toContain('resolveCanvasNodeAdmissionTransaction');
    expect(NODE_ADMISSION_COMMAND_RUNNER_SOURCE).toContain('latestNodesRef');
    expect(NODE_ADMISSION_COMMAND_RUNNER_SOURCE).toContain('latestDraftSessionRef');
    expect(NODE_ADMISSION_COMMAND_RUNNER_SOURCE).toContain(
      'latestNodesRef.current = transaction.nodes'
    );
    expect(NODE_ADMISSION_COMMAND_RUNNER_SOURCE).toContain(
      'latestDraftSessionRef.current = transaction.draftSession'
    );
    expect(NODE_ADMISSION_COMMAND_RUNNER_SOURCE).not.toContain('toast.');
  });
});
