import type { Edge } from '@xyflow/react';
import { describe, expect, it } from 'vitest';

import { buildTestNodeKind } from './canvasKindRegistration.testSupport';
import {
  buildCanvasContextMenuModel,
  buildCanvasEdgeContextRemovalChange,
} from './canvasInteractionCommandSurface';

describe('canvasInteractionCommandSurface', () => {
  it('offers spatial add commands for an editable background context menu', () => {
    const sourceKind = buildTestNodeKind('dvt:source', 'Source');
    const modelKind = buildTestNodeKind('dbt:model', 'Model');
    const model = buildCanvasContextMenuModel({
      target: {
        kind: 'pane',
        screenPosition: { x: 480, y: 320 },
        flowPosition: { x: 720, y: 180 },
      },
      canMutateGraph: true,
      authoringNodeKinds: [sourceKind, modelKind],
    });

    expect(model).toMatchObject({
      kind: 'pane',
      screenPosition: { x: 480, y: 320 },
      flowPosition: { x: 720, y: 180 },
      canvasActions: [],
      createNodeActions: [
        { action: 'create-node', label: 'Add source', registration: sourceKind },
        { action: 'create-node', label: 'Add model', registration: modelKind },
      ],
      edgeActions: [],
    });
  });

  it('offers source import as a canvas action only when the editable source rail is available', () => {
    const sourceKind = buildTestNodeKind('dbt:source', 'Source');
    const model = buildCanvasContextMenuModel({
      target: {
        kind: 'pane',
        screenPosition: { x: 480, y: 320 },
        flowPosition: { x: 720, y: 180 },
      },
      canMutateGraph: true,
      canOpenSourceImport: true,
      authoringNodeKinds: [sourceKind],
    });

    expect(model.canvasActions).toEqual([{ action: 'open-source-import', label: 'Add source' }]);
    expect(model.createNodeActions).toEqual([]);
  });

  it('keeps DVT source creation visible because dbt source import does not materialize DVT nodes', () => {
    const sourceKind = buildTestNodeKind('dvt:source', 'Source');
    const model = buildCanvasContextMenuModel({
      target: {
        kind: 'pane',
        screenPosition: { x: 480, y: 320 },
        flowPosition: { x: 720, y: 180 },
      },
      canMutateGraph: true,
      canOpenSourceImport: true,
      authoringNodeKinds: [sourceKind],
    });

    expect(model.canvasActions).toEqual([{ action: 'open-source-import', label: 'Add source' }]);
    expect(model.createNodeActions).toEqual([
      { action: 'create-node', label: 'Create source node', registration: sourceKind },
    ]);
  });

  it('offers execution preview from the canvas menu independently from graph mutation', () => {
    const model = buildCanvasContextMenuModel({
      target: {
        kind: 'pane',
        screenPosition: { x: 480, y: 320 },
        flowPosition: { x: 720, y: 180 },
      },
      canMutateGraph: false,
      canPreviewExecutionPlan: true,
      authoringNodeKinds: [buildTestNodeKind('dvt:source', 'Source')],
    });

    expect(model.canvasActions).toEqual([
      { action: 'preview-execution-plan', label: 'Preview execution plan' },
    ]);
    expect(model.createNodeActions).toEqual([]);
    expect(model.edgeActions).toEqual([]);
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
      canvasActions: [],
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
      canOpenSourceImport: true,
      authoringNodeKinds: [buildTestNodeKind('dvt:source', 'Source')],
    });

    expect(model.canvasActions).toEqual([]);
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
