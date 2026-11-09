// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { canvasDraftSession } from './canvasDraftSession';
import { deriveCanvasAuthoringState } from './canvasAuthoringState';
import type { CanonicalNode } from '../../types/canonical';

function inspectCatalogueNode(
  node: CanonicalNode,
  inspectorNodeId = node.id,
  placed = false
): ReturnType<typeof deriveCanvasAuthoringState> {
  return deriveCanvasAuthoringState({
    draftSession: canvasDraftSession.machine.bootstrap({
      remoteDraft: null,
      canonicalNodeIds: placed ? [node.id] : [],
      canonicalEdges: [],
    }),
    canonicalNodes: [node],
    canonicalEdges: [],
    selectionIntent: { mode: 'explicit', nodeIds: [node.id] },
    inspectorNodeId,
    draftSaveStatus: 'idle',
    canMutateGraphTransport: false,
    draftReadModel: undefined,
    authTransportPosture: 'none',
  });
}

const catalogueNode: CanonicalNode = {
  id: 'catalogue-model',
  name: 'Catalogue model',
  pluginId: 'dvt',
  kind: 'dvt:transform',
  role: 'transform',
  status: 'idle',
  tags: [],
};

describe('canvasAuthoringState', () => {
  it.each(['input', 'transform'] as const)(
    'retains an unplaced %s definition for inspection without granting graph or execution membership',
    (role) => {
      // GH-3765: catalogue click must inspect a definition without manufacturing a placement.
      const state = inspectCatalogueNode({
        ...catalogueNode,
        kind: role === 'input' ? 'dvt:source' : 'dvt:transform',
        role,
      });

      expect(state.uiScope).toEqual({ selectedNodeIds: [], inspectorNodeId: catalogueNode.id });
      expect(state.visibleScope.visibleNodeIds).toEqual([]);
      expect(state.visibleScope.canonicalNodes).toEqual([]);
      expect(state.executionScope.selectedNodeIds).toEqual([]);
      expect(state.executionScope.workspaceNodeIds).toEqual([]);
      expect(state.canMutateGraph).toBe(false);
    }
  );

  it.each([
    { label: 'output', node: { ...catalogueNode, role: 'output' as const } },
    { label: 'check', node: { ...catalogueNode, role: 'check' as const } },
    { label: 'control', node: { ...catalogueNode, role: 'control' as const } },
    { label: 'model occurrence', node: { ...catalogueNode, definitionId: 'definition' } },
    {
      label: 'legacy source occurrence',
      node: {
        ...catalogueNode,
        kind: 'dvt:source' as const,
        role: 'input' as const,
        sourceDefinitionId: 'definition',
      },
    },
  ])('rejects an unplaced $label as a catalogue definition', ({ node }) => {
    // Inspectable definitions must not revive removed occurrences or unrelated canonical roles.
    expect(inspectCatalogueNode(node).uiScope.inspectorNodeId).toBeNull();
  });

  it('rejects an inspector identity missing from the current catalogue', () => {
    expect(inspectCatalogueNode(catalogueNode, 'foreign-model').uiScope.inspectorNodeId).toBeNull();
  });

  it('retains inspection of a visible occurrence through its existing placement scope', () => {
    const node = { ...catalogueNode, definitionId: 'definition' };
    const state = inspectCatalogueNode(node, node.id, true);

    expect(state.uiScope.inspectorNodeId).toBe(node.id);
    expect(state.visibleScope.visibleNodeIds).toEqual([node.id]);
    expect(state.executionScope.selectedNodeIds).toEqual([node.id]);
  });

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
