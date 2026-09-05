// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { canvasDraftSession } from './canvasDraftSession';
import { deriveCanvasAuthoringState } from './canvasAuthoringState';

describe('canvasAuthoringState', () => {
  it('preserves UI selection while the draft session is bootstrapping', () => {
    const authoringState = deriveCanvasAuthoringState({
      draftSession: canvasDraftSession.machine.createBootstrapping(),
      canonicalNodes: [],
      canonicalEdges: [],
      selectionIntent: { mode: 'explicit', nodeIds: ['node_1'] },
      inspectorNodeId: 'node_1',
      draftSaveStatus: 'idle',
      canMutateGraphTransport: true,
      draftReadModel: undefined,
      authTransportPosture: 'none',
    });

    expect(authoringState.uiScope).toEqual({
      selectedNodeIds: ['node_1'],
      inspectorNodeId: 'node_1',
    });
    expect(authoringState.draftAccessPosture.kind).toBe('unknown_pending');
    expect(authoringState.draftStatusState.label).not.toBe('Draft synced');
    expect(authoringState.canMutateGraph).toBe(false);
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
      selectionIntent: { mode: 'explicit', nodeIds: ['node_1'] },
      inspectorNodeId: 'node_1',
      draftSaveStatus: 'idle',
      canMutateGraphTransport: true,
      draftReadModel: undefined,
      authTransportPosture: 'none',
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
      selectionIntent: { mode: 'explicit', nodeIds: ['node_1'] },
      inspectorNodeId: 'node_1',
      draftSaveStatus: 'idle',
      canMutateGraphTransport: true,
      draftReadModel: {
        accessMode: 'read_only',
        authoringAuthority: {
          kind: 'unresolved',
          reason: 'missing_authority',
          canvasId: null,
        },
        capabilityReason: 'write_denied',
        formatError: null,
        formatMeta: null,
        record: null,
        semanticGraph: null,
      },
      authTransportPosture: 'none',
    });

    expect(authoringState.draftAccessPosture.kind).toBe('read_only');
    expect(authoringState.draftStatusState.label).toBe('Read-only draft');
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
      selectionIntent: { mode: 'explicit', nodeIds: ['node_1'] },
      inspectorNodeId: 'node_1',
      draftSaveStatus: 'idle',
      canMutateGraphTransport: true,
      draftReadModel: {
        accessMode: 'forbidden',
        authoringAuthority: {
          kind: 'unresolved',
          reason: 'missing_authority',
          canvasId: null,
        },
        capabilityReason: 'workspace_scope_denied',
        formatError: null,
        formatMeta: null,
        record: null,
        semanticGraph: null,
      },
      authTransportPosture: 'none',
    });

    expect(authoringState.draftAccessPosture.kind).toBe('forbidden_scope');
    expect(authoringState.draftAccessMode).toBe('forbidden');
    expect(authoringState.isDraftAccessBlocked).toBe(true);
    expect(authoringState.canMutateGraph).toBe(false);
  });

  it('maps final auth transport failure to session-required posture without draft contract truth', () => {
    const authoringState = deriveCanvasAuthoringState({
      draftSession: canvasDraftSession.machine.bootstrap({
        remoteDraft: null,
        canonicalNodeIds: ['node_1'],
        canonicalEdges: [],
      }),
      canonicalNodes: [],
      canonicalEdges: [],
      selectionIntent: { mode: 'explicit', nodeIds: ['node_1'] },
      inspectorNodeId: 'node_1',
      draftSaveStatus: 'idle',
      canMutateGraphTransport: true,
      draftReadModel: undefined,
      authTransportPosture: 'unauthorized_final',
    });

    expect(authoringState.draftAccessPosture.kind).toBe('unauthenticated');
    expect(authoringState.draftStatusState.label).toBe('Session required');
    expect(authoringState.isDraftAccessBlocked).toBe(true);
    expect(authoringState.canMutateGraph).toBe(false);
  });
});
