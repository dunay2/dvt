import { describe, expect, it } from 'vitest';

import {
  assertCanvasFirstAuthoringInvariant,
  isCanvasFirstAuthoringProofComplete,
} from './canvasFirstAuthoringProofInvariant';
import { deriveCanvasFirstAuthoringLiveProof } from './canvasFirstAuthoringLiveProof';
import type {
  CanvasFirstAuthoringCanvas,
  CanvasFirstAuthoringLiveProof,
  CanvasFirstAuthoringLiveProofInput,
  CanvasFirstAuthoringNode,
} from './canvasFirstAuthoringLiveProof.types';

const transformationCanvas: CanvasFirstAuthoringCanvas = {
  kind: 'transformation',
  title: 'Transformation canvas',
};
const dbtCanvas: CanvasFirstAuthoringCanvas = { kind: 'dbt', title: 'dbt canvas' };
const sqlCanvas: CanvasFirstAuthoringCanvas = { kind: 'sql', title: 'SQL canvas' };
const transformationNode: CanvasFirstAuthoringNode = {
  id: 'dvt-transform-1',
  kind: 'dvt:transform',
  name: 'Transform 1',
};
const dbtNode: CanvasFirstAuthoringNode = {
  id: 'dbt-model-1',
  kind: 'dvt:transform',
  name: 'Model 1',
};
const persistedLayout = {
  nodeId: 'dvt-transform-1',
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

function savedCanvas(
  canvas: CanvasFirstAuthoringCanvas,
  saveSettled = true
): NonNullable<CanvasFirstAuthoringLiveProofInput['createdCanvas']> {
  return { canvas, saveSettled };
}

function savedNode(
  node: CanvasFirstAuthoringNode,
  saveSettled = true
): NonNullable<CanvasFirstAuthoringLiveProofInput['createdNode']> {
  return { node, saveSettled };
}

function persistedTransformationInput(
  overrides: Partial<CanvasFirstAuthoringLiveProofInput> = {}
): CanvasFirstAuthoringLiveProofInput {
  return baseInput({
    activeCanvas: transformationCanvas,
    createdCanvas: savedCanvas(transformationCanvas),
    createdNode: savedNode(transformationNode),
    persistedLayout,
    ...overrides,
  });
}

function restoredDraft(
  canvas: CanvasFirstAuthoringCanvas | null,
  nodeIds: readonly string[] = ['dvt-transform-1'],
  position = persistedLayout.position
): NonNullable<CanvasFirstAuthoringLiveProofInput['restoredDraft']> {
  return {
    canvas,
    nodeIds,
    nodePositions: Object.fromEntries(nodeIds.map((nodeId) => [nodeId, position])),
  };
}

describe('canvasFirstAuthoringLiveProof', () => {
  it.each([
    [
      'needs canvas',
      baseInput(),
      { kind: 'needs_canvas', completed: false, nextCommand: 'CreateCanvas' },
    ],
    [
      'proves saved transformation canvas',
      baseInput({
        activeCanvas: transformationCanvas,
        createdCanvas: savedCanvas(transformationCanvas),
      }),
      { kind: 'canvas_created', canvas: transformationCanvas, nextCommand: 'CreateCanvasNode' },
    ],
    [
      'proves saved transformation node',
      baseInput({
        activeCanvas: transformationCanvas,
        createdCanvas: savedCanvas(transformationCanvas),
        createdNode: savedNode(transformationNode),
      }),
      { kind: 'node_created', node: transformationNode, nextCommand: 'PersistCanvasLayout' },
    ],
    [
      'proves persisted layout',
      persistedTransformationInput(),
      { kind: 'layout_persisted', layout: persistedLayout, nextQuery: 'GetWorkspaceGraphDraft' },
    ],
  ])('%s', (_name, input, expected) => {
    expect(deriveCanvasFirstAuthoringLiveProof(input)).toMatchObject(expected);
  });

  it('proves restored state only when draft and layout contain the first node', () => {
    const proof = deriveCanvasFirstAuthoringLiveProof(
      persistedTransformationInput({
        restoredDraft: restoredDraft(transformationCanvas),
      })
    );

    expect(proof).toMatchObject({
      kind: 'restored',
      completed: true,
      node: transformationNode,
      layout: persistedLayout,
    });
    expect(isCanvasFirstAuthoringProofComplete(proof)).toBe(true);
    expect(() => assertCanvasFirstAuthoringInvariant(proof)).not.toThrow();
  });

  it.each([
    [
      'draft access is blocked',
      baseInput({ draftAccess: { kind: 'blocked', reason: 'read_only' } }),
      { reason: 'read_only', blockedCommand: 'CreateCanvas' },
    ],
    [
      'first canvas save has not settled',
      baseInput({
        activeCanvas: transformationCanvas,
        createdCanvas: savedCanvas(transformationCanvas, false),
        createdNode: savedNode(transformationNode),
      }),
      { reason: 'canvas_save_not_settled', blockedCommand: 'CreateCanvasNode' },
    ],
    [
      'draft canvas and created canvas do not match',
      baseInput({ activeCanvas: dbtCanvas, createdCanvas: savedCanvas(transformationCanvas) }),
      { reason: 'draft_canvas_mismatch', blockedCommand: 'CreateCanvas' },
    ],
    [
      'first node kind does not match the canvas default',
      baseInput({
        activeCanvas: transformationCanvas,
        createdCanvas: savedCanvas(transformationCanvas),
        createdNode: savedNode(dbtNode),
      }),
      { reason: 'first_node_mismatch', expectedNode: transformationNode },
    ],
    [
      'legacy dbt canvas kind is unsupported',
      baseInput({
        activeCanvas: dbtCanvas,
        createdCanvas: savedCanvas(dbtCanvas),
        createdNode: savedNode(dbtNode),
      }),
      { reason: 'unsupported_canvas_kind', blockedCommand: 'CreateCanvasNode' },
    ],
    [
      'canvas kind is unsupported',
      baseInput({
        activeCanvas: sqlCanvas,
        createdCanvas: savedCanvas(sqlCanvas),
        createdNode: savedNode(transformationNode),
      }),
      { reason: 'unsupported_canvas_kind', blockedCommand: 'CreateCanvasNode' },
    ],
    [
      'first node save has not settled',
      baseInput({
        activeCanvas: transformationCanvas,
        createdCanvas: savedCanvas(transformationCanvas),
        createdNode: savedNode(transformationNode, false),
      }),
      { reason: 'node_save_not_settled', blockedCommand: 'PersistCanvasLayout' },
    ],
    [
      'reloaded draft omits the canvas',
      persistedTransformationInput({ restoredDraft: restoredDraft(null) }),
      { reason: 'restored_canvas_missing', blockedQuery: 'GetWorkspaceGraphDraft' },
    ],
    [
      'reloaded draft omits the created node',
      persistedTransformationInput({ restoredDraft: restoredDraft(transformationCanvas, []) }),
      { reason: 'restored_node_missing', blockedQuery: 'GetWorkspaceGraphDraft' },
    ],
    [
      'reloaded layout omits the persisted node coordinate',
      persistedTransformationInput({
        restoredDraft: restoredDraft(transformationCanvas, ['dvt-transform-1'], { x: 1, y: 2 }),
      }),
      { reason: 'restored_layout_missing', blockedQuery: 'GetCanvasLayout' },
    ],
  ])('blocks proof when %s', (_name, input, expected) => {
    expect(deriveCanvasFirstAuthoringLiveProof(input)).toMatchObject({
      kind: 'blocked',
      ...expected,
    });
  });

  it('throws when a handcrafted restored proof violates its invariant', () => {
    const invalidProof: CanvasFirstAuthoringLiveProof = {
      kind: 'restored',
      transition: 'restored',
      completed: true,
      canvas: transformationCanvas,
      node: transformationNode,
      layout: { nodeId: 'different-node', position: { x: 1, y: 2 } },
    };

    expect(() => assertCanvasFirstAuthoringInvariant(invalidProof)).toThrow(
      /restored proof layout must belong to the created node/
    );
  });
});
