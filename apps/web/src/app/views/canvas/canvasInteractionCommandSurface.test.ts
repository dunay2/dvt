import type { Edge } from '@xyflow/react';
import { describe, expect, it } from 'vitest';

import { buildTestNodeKind } from './canvasKindRegistration.testSupport';
import {
  buildCanvasContextMenuModel,
  buildCanvasEdgeContextRemovalChange,
} from './canvasInteractionCommandSurface';

describe('canvasInteractionCommandSurface', () => {
  it('offers node creation actions for an editable background context menu', () => {
    const sourceKind = buildTestNodeKind('dvt:source', 'Source');
    const model = buildCanvasContextMenuModel({
      target: {
        kind: 'pane',
        screenPosition: { x: 480, y: 320 },
        flowPosition: { x: 720, y: 180 },
      },
      canMutateGraph: true,
      authoringNodeKinds: [sourceKind],
    });

    expect(model).toMatchObject({
      kind: 'pane',
      screenPosition: { x: 480, y: 320 },
      flowPosition: { x: 720, y: 180 },
      createNodeActions: [{ action: 'create-node', label: 'Source', registration: sourceKind }],
      edgeActions: [],
    });
  });

  it('offers only edge deletion for an editable edge context menu', () => {
    const model = buildCanvasContextMenuModel({
      target: {
        kind: 'edge',
        edgeId: 'edge-source-model',
        screenPosition: { x: 600, y: 360 },
      },
      canMutateGraph: true,
      authoringNodeKinds: [buildTestNodeKind('dvt:source', 'Source')],
    });

    expect(model).toMatchObject({
      kind: 'edge',
      edgeId: 'edge-source-model',
      screenPosition: { x: 600, y: 360 },
      createNodeActions: [],
      edgeActions: [{ action: 'remove-edge', label: 'Eliminar conexión' }],
    });
  });

  it('fails closed when graph mutation is not allowed', () => {
    const model = buildCanvasContextMenuModel({
      target: {
        kind: 'pane',
        screenPosition: { x: 480, y: 320 },
        flowPosition: { x: 720, y: 180 },
      },
      canMutateGraph: false,
      authoringNodeKinds: [buildTestNodeKind('dvt:source', 'Source')],
    });

    expect(model.createNodeActions).toEqual([]);
    expect(model.edgeActions).toEqual([]);
  });

  it('uses the existing React Flow edge-change contract for edge deletion', () => {
    const edge: Edge = {
      id: 'edge-source-model',
      source: 'source',
      target: 'model',
    };

    expect(buildCanvasEdgeContextRemovalChange(edge)).toEqual({
      id: 'edge-source-model',
      type: 'remove',
    });
  });
});
