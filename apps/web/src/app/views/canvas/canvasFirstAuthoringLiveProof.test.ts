import { describe, expect, it } from 'vitest';

import {
  assertCanvasFirstAuthoringInvariant,
  deriveCanvasFirstAuthoringLiveProof,
  isCanvasFirstAuthoringProofComplete,
  type CanvasFirstAuthoringLiveProof,
  type CanvasFirstAuthoringLiveProofInput,
} from './canvasFirstAuthoringLiveProof';

describe('canvasFirstAuthoringLiveProof', () => {
  const transformationCanvas = {
    kind: 'transformation',
    title: 'Transformation canvas',
  };

  const dbtCanvas = {
    kind: 'dbt',
    title: 'dbt canvas',
  };

  const transformationNode = {
    id: 'dvt-source-1',
    kind: 'dvt:source',
    name: 'Source 1',
  };

  const dbtNode = {
    id: 'dbt-source-1',
    kind: 'dbt:source',
    name: 'Source 1',
  };

  const persistedLayout = {
    nodeId: 'dvt-source-1',
    position: { x: 320, y: 180 },
  };

  function baseInput(
    overrides: Partial<CanvasFirstAuthoringLiveProofInput> = {}
  ): CanvasFirstAuthoringLiveProofInput {
    return {
      draftAccess: { kind: 'writable' },
      activeCanvas: null,
      createdCanvas: null,
      createdNode: null,
      persistedLayout: null,
      restoredDraft: null,
      ...overrides,
    };
  }

  it('starts in needs_canvas when the live draft has no active canvas', () => {
    expect(deriveCanvasFirstAuthoringLiveProof(baseInput())).toEqual({
      kind: 'needs_canvas',
      transition: 'needs_canvas',
      completed: false,
      nextCommand: 'CreateCanvas',
    });
  });

  it('proves a saved first transformation canvas before node creation', () => {
    expect(
      deriveCanvasFirstAuthoringLiveProof(
        baseInput({
          activeCanvas: transformationCanvas,
          createdCanvas: {
            canvas: transformationCanvas,
            saveSettled: true,
          },
        })
      )
    ).toEqual({
      kind: 'canvas_created',
      transition: 'canvas_created',
      completed: false,
      canvas: transformationCanvas,
      nextCommand: 'CreateCanvasNode',
    });
  });

  it('proves the first transformation source node after graph save settles', () => {
    expect(
      deriveCanvasFirstAuthoringLiveProof(
        baseInput({
          activeCanvas: transformationCanvas,
          createdCanvas: {
            canvas: transformationCanvas,
            saveSettled: true,
          },
          createdNode: {
            node: transformationNode,
            saveSettled: true,
          },
        })
      )
    ).toEqual({
      kind: 'node_created',
      transition: 'node_created',
      completed: false,
      canvas: transformationCanvas,
      node: transformationNode,
      nextCommand: 'PersistCanvasLayout',
    });
  });

  it('proves persisted layout using the dropped node coordinate', () => {
    expect(
      deriveCanvasFirstAuthoringLiveProof(
        baseInput({
          activeCanvas: transformationCanvas,
          createdCanvas: {
            canvas: transformationCanvas,
            saveSettled: true,
          },
          createdNode: {
            node: transformationNode,
            saveSettled: true,
          },
          persistedLayout,
        })
      )
    ).toEqual({
      kind: 'layout_persisted',
      transition: 'layout_persisted',
      completed: false,
      canvas: transformationCanvas,
      node: transformationNode,
      layout: persistedLayout,
      nextQuery: 'GetWorkspaceGraphDraft',
    });
  });

  it('proves restored state only when draft and layout contain the first node', () => {
    const proof = deriveCanvasFirstAuthoringLiveProof(
      baseInput({
        activeCanvas: transformationCanvas,
        createdCanvas: {
          canvas: transformationCanvas,
          saveSettled: true,
        },
        createdNode: {
          node: transformationNode,
          saveSettled: true,
        },
        persistedLayout,
        restoredDraft: {
          canvas: transformationCanvas,
          nodeIds: ['dvt-source-1'],
          nodePositions: {
            'dvt-source-1': { x: 320, y: 180 },
          },
        },
      })
    );

    expect(proof).toEqual({
      kind: 'restored',
      transition: 'restored',
      completed: true,
      canvas: transformationCanvas,
      node: transformationNode,
      layout: persistedLayout,
    });
    expect(isCanvasFirstAuthoringProofComplete(proof)).toBe(true);
    expect(() => assertCanvasFirstAuthoringInvariant(proof)).not.toThrow();
  });

  it('uses dbt first-node defaults for dbt canvases', () => {
    expect(
      deriveCanvasFirstAuthoringLiveProof(
        baseInput({
          activeCanvas: dbtCanvas,
          createdCanvas: {
            canvas: dbtCanvas,
            saveSettled: true,
          },
          createdNode: {
            node: dbtNode,
            saveSettled: true,
          },
        })
      )
    ).toMatchObject({
      kind: 'node_created',
      node: dbtNode,
    });
  });

  it('blocks first authoring when draft access is not writable', () => {
    expect(
      deriveCanvasFirstAuthoringLiveProof(
        baseInput({
          draftAccess: { kind: 'blocked', reason: 'read_only' },
        })
      )
    ).toEqual({
      kind: 'blocked',
      transition: 'blocked',
      completed: false,
      reason: 'read_only',
      blockedCommand: 'CreateCanvas',
    });
  });

  it('blocks first node proof before the first canvas save settles', () => {
    expect(
      deriveCanvasFirstAuthoringLiveProof(
        baseInput({
          activeCanvas: transformationCanvas,
          createdCanvas: {
            canvas: transformationCanvas,
            saveSettled: false,
          },
          createdNode: {
            node: transformationNode,
            saveSettled: true,
          },
        })
      )
    ).toMatchObject({
      kind: 'blocked',
      reason: 'canvas_save_not_settled',
      blockedCommand: 'CreateCanvasNode',
    });
  });

  it('blocks first-node proof when the node kind does not match the canvas default', () => {
    expect(
      deriveCanvasFirstAuthoringLiveProof(
        baseInput({
          activeCanvas: transformationCanvas,
          createdCanvas: {
            canvas: transformationCanvas,
            saveSettled: true,
          },
          createdNode: {
            node: dbtNode,
            saveSettled: true,
          },
        })
      )
    ).toMatchObject({
      kind: 'blocked',
      reason: 'first_node_mismatch',
      expectedNode: transformationNode,
    });
  });

  it('blocks first-node proof for unsupported canvas kinds', () => {
    expect(
      deriveCanvasFirstAuthoringLiveProof(
        baseInput({
          activeCanvas: { kind: 'sql', title: 'SQL canvas' },
          createdCanvas: {
            canvas: { kind: 'sql', title: 'SQL canvas' },
            saveSettled: true,
          },
          createdNode: {
            node: transformationNode,
            saveSettled: true,
          },
        })
      )
    ).toMatchObject({
      kind: 'blocked',
      reason: 'unsupported_canvas_kind',
      blockedCommand: 'CreateCanvasNode',
    });
  });

  it('blocks layout persistence before the first node save settles', () => {
    expect(
      deriveCanvasFirstAuthoringLiveProof(
        baseInput({
          activeCanvas: transformationCanvas,
          createdCanvas: {
            canvas: transformationCanvas,
            saveSettled: true,
          },
          createdNode: {
            node: transformationNode,
            saveSettled: false,
          },
        })
      )
    ).toMatchObject({
      kind: 'blocked',
      reason: 'node_save_not_settled',
      blockedCommand: 'PersistCanvasLayout',
    });
  });

  it('blocks restored proof when the reloaded draft omits the canvas', () => {
    expect(
      deriveCanvasFirstAuthoringLiveProof(
        baseInput({
          activeCanvas: transformationCanvas,
          createdCanvas: {
            canvas: transformationCanvas,
            saveSettled: true,
          },
          createdNode: {
            node: transformationNode,
            saveSettled: true,
          },
          persistedLayout,
          restoredDraft: {
            canvas: null,
            nodeIds: ['dvt-source-1'],
            nodePositions: {
              'dvt-source-1': { x: 320, y: 180 },
            },
          },
        })
      )
    ).toMatchObject({
      kind: 'blocked',
      reason: 'restored_canvas_missing',
      blockedQuery: 'GetWorkspaceGraphDraft',
    });
  });

  it('blocks restored proof when the reloaded draft omits the created node', () => {
    expect(
      deriveCanvasFirstAuthoringLiveProof(
        baseInput({
          activeCanvas: transformationCanvas,
          createdCanvas: {
            canvas: transformationCanvas,
            saveSettled: true,
          },
          createdNode: {
            node: transformationNode,
            saveSettled: true,
          },
          persistedLayout,
          restoredDraft: {
            canvas: transformationCanvas,
            nodeIds: [],
            nodePositions: {},
          },
        })
      )
    ).toMatchObject({
      kind: 'blocked',
      reason: 'restored_node_missing',
      blockedQuery: 'GetWorkspaceGraphDraft',
    });
  });

  it('blocks restored proof when the reloaded layout omits the persisted node coordinate', () => {
    expect(
      deriveCanvasFirstAuthoringLiveProof(
        baseInput({
          activeCanvas: transformationCanvas,
          createdCanvas: {
            canvas: transformationCanvas,
            saveSettled: true,
          },
          createdNode: {
            node: transformationNode,
            saveSettled: true,
          },
          persistedLayout,
          restoredDraft: {
            canvas: transformationCanvas,
            nodeIds: ['dvt-source-1'],
            nodePositions: {
              'dvt-source-1': { x: 1, y: 2 },
            },
          },
        })
      )
    ).toMatchObject({
      kind: 'blocked',
      reason: 'restored_layout_missing',
      blockedQuery: 'GetCanvasLayout',
    });
  });

  it('throws when a handcrafted restored proof violates its invariant', () => {
    const invalidProof: CanvasFirstAuthoringLiveProof = {
      kind: 'restored',
      transition: 'restored',
      completed: true,
      canvas: transformationCanvas,
      node: transformationNode,
      layout: {
        nodeId: 'different-node',
        position: { x: 1, y: 2 },
      },
    };

    expect(() => assertCanvasFirstAuthoringInvariant(invalidProof)).toThrow(
      /restored proof layout must belong to the created node/
    );
  });
});
