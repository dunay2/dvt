import { describe, expect, it } from 'vitest';

import {
  canvasDraftSession,
} from './canvasDraftSession';
import { deriveCanvasAuthoringState } from './canvasAuthoringState';

describe('canvasAuthoringState', () => {
  it('preserves UI selection while the draft session is bootstrapping', () => {
    const authoringState = deriveCanvasAuthoringState({
      draftSession: canvasDraftSession.machine.createBootstrapping(),
      canonicalNodes: [],
      canonicalEdges: [],
      selectedNodeIds: ['node_1'],
      inspectorNodeId: 'node_1',
      draftSaveStatus: 'idle',
      canPersistDraftTransport: true,
      draftReadModel: undefined,
    });

    expect(authoringState.uiScope).toEqual({
      selectedNodeIds: ['node_1'],
      inspectorNodeId: 'node_1',
    });
    expect(authoringState.canMutateGraph).toBe(true);
  });

  it('blocks mutation and reports missing_remote recovery explicitly', () => {
    const authoringState = deriveCanvasAuthoringState({
      draftSession: canvasDraftSession.machine.markRemoteDraftMissing(
        canvasDraftSession.machine.bootstrap({
          remoteDraft: null,
          canonicalNodeIds: ['node_1'],
          canonicalEdges: [],
        })
      ),
      canonicalNodes: [],
      canonicalEdges: [],
      selectedNodeIds: ['node_1'],
      inspectorNodeId: 'node_1',
      draftSaveStatus: 'idle',
      canPersistDraftTransport: true,
      draftReadModel: undefined,
    });

    expect(authoringState.isMissingRemoteDraft).toBe(true);
    expect(authoringState.draftRecoveryReason).toBe('missing_remote');
    expect(authoringState.isDraftRecoveryBlocked).toBe(true);
    expect(authoringState.canMutateGraph).toBe(false);
  });

  it('keeps inspection available but disables graph mutation when the draft boundary is read_only', () => {
    const authoringState = deriveCanvasAuthoringState({
      draftSession: canvasDraftSession.machine.bootstrap({
        remoteDraft: null,
        canonicalNodeIds: ['node_1'],
        canonicalEdges: [],
      }),
      canonicalNodes: [],
      canonicalEdges: [],
      selectedNodeIds: ['node_1'],
      inspectorNodeId: 'node_1',
      draftSaveStatus: 'idle',
      canPersistDraftTransport: true,
      draftReadModel: {
        accessMode: 'read_only',
        capabilityReason: 'write_denied',
        formatError: null,
        formatMeta: null,
        record: null,
        semanticGraph: null,
      },
    });

    expect(authoringState.draftAccessMode).toBe('read_only');
    expect(authoringState.draftFormatError).toBeNull();
    expect(authoringState.isDraftAccessBlocked).toBe(false);
    expect(authoringState.isDraftReadOnly).toBe(true);
    expect(authoringState.canMutateGraph).toBe(false);
  });

  it('surfaces forbidden draft access as a blocked authoring posture', () => {
    const authoringState = deriveCanvasAuthoringState({
      draftSession: canvasDraftSession.machine.bootstrap({
        remoteDraft: null,
        canonicalNodeIds: ['node_1'],
        canonicalEdges: [],
      }),
      canonicalNodes: [],
      canonicalEdges: [],
      selectedNodeIds: ['node_1'],
      inspectorNodeId: 'node_1',
      draftSaveStatus: 'idle',
      canPersistDraftTransport: true,
      draftReadModel: {
        accessMode: 'forbidden',
        capabilityReason: 'workspace_scope_denied',
        formatError: null,
        formatMeta: null,
        record: null,
        semanticGraph: null,
      },
    });

    expect(authoringState.draftAccessMode).toBe('forbidden');
    expect(authoringState.isDraftAccessBlocked).toBe(true);
    expect(authoringState.canMutateGraph).toBe(false);
  });
});
