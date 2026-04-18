import { describe, expect, it } from 'vitest';

import {
  bootstrapSession,
  createBootstrappingCanvasDraftSession,
  markRemoteDraftMissing,
} from './canvasDraftSession';
import { deriveCanvasAuthoringState } from './canvasAuthoringState';

describe('canvasAuthoringState', () => {
  it('preserves UI selection while the draft session is bootstrapping', () => {
    const authoringState = deriveCanvasAuthoringState({
      draftSession: createBootstrappingCanvasDraftSession(),
      canonicalNodes: [],
      canonicalEdges: [],
      selectedNodeIds: ['node_1'],
      inspectorNodeId: 'node_1',
      draftSaveStatus: 'idle',
      canPersistDraftTransport: true,
    });

    expect(authoringState.uiScope).toEqual({
      selectedNodeIds: ['node_1'],
      inspectorNodeId: 'node_1',
    });
    expect(authoringState.canMutateGraph).toBe(true);
  });

  it('blocks mutation and reports missing_remote recovery explicitly', () => {
    const authoringState = deriveCanvasAuthoringState({
      draftSession: markRemoteDraftMissing(
        bootstrapSession({
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
    });

    expect(authoringState.isMissingRemoteDraft).toBe(true);
    expect(authoringState.draftRecoveryReason).toBe('missing_remote');
    expect(authoringState.isDraftRecoveryBlocked).toBe(true);
    expect(authoringState.canMutateGraph).toBe(false);
  });
});
