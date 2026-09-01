import type { Edge } from '@xyflow/react';
import { describe, expect, it } from 'vitest';

import { buildTestNodeKind } from './canvasKindRegistration.testSupport';
import { resolveCanvasViewCopy } from './copy';
import {
  buildCanvasAddNodeCatalogMenuModel,
  buildCanvasContextMenuModel,
  buildCanvasEdgeContextRemovalChange,
} from './canvasInteractionCommandSurface';

describe('canvasInteractionCommandSurface', () => {
  it('offers only the add catalog command for an editable background context menu', () => {
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
      surface: 'root',
      kind: 'pane',
      screenPosition: { x: 480, y: 320 },
      flowPosition: { x: 720, y: 180 },
      canvasActions: [{ action: 'open-add-node-catalog', label: 'Add...' }],
      createNodeActions: [],
      edgeActions: [],
    });
  });

  it('keeps source import out of the background root menu', () => {
    const sourceKind = buildTestNodeKind('dbt:source', 'Source');
    const model = buildCanvasContextMenuModel({
      target: {
        kind: 'pane',
        screenPosition: { x: 480, y: 320 },
        flowPosition: { x: 720, y: 180 },
      },
      canMutateGraph: true,
      authoringNodeKinds: [sourceKind],
    });

    expect(model.canvasActions).toEqual([{ action: 'open-add-node-catalog', label: 'Add...' }]);
    expect(model.createNodeActions).toEqual([]);
  });

  it('projects categorized add-node catalog items separately from the root menu', () => {
    const sourceKind = buildTestNodeKind('dvt:source', 'Source');
    const model = buildCanvasAddNodeCatalogMenuModel({
      sourceModel: buildCanvasContextMenuModel({
        target: {
          kind: 'pane',
          screenPosition: { x: 480, y: 320 },
          flowPosition: { x: 720, y: 180 },
        },
        canMutateGraph: true,
        authoringNodeKinds: [sourceKind],
      }),
      authoringNodeKinds: [sourceKind],
    });

    expect(model?.surface).toBe('add-node-catalog');
    expect(model?.canvasActions).toEqual([]);
    expect(model?.createNodeActions).toEqual([
      { action: 'create-node', label: 'Add source', registration: sourceKind },
    ]);
  });

  it('keeps source import as a categorized add-node catalog action when the source rail is available', () => {
    const sourceKind = buildTestNodeKind('dvt:source', 'Source');
    const modelKind = buildTestNodeKind('dbt:model', 'Model');
    const model = buildCanvasAddNodeCatalogMenuModel({
      sourceModel: buildCanvasContextMenuModel({
        target: {
          kind: 'pane',
          screenPosition: { x: 480, y: 320 },
          flowPosition: { x: 720, y: 180 },
        },
        canMutateGraph: true,
        authoringNodeKinds: [sourceKind, modelKind],
      }),
      authoringNodeKinds: [sourceKind, modelKind],
      canOpenSourceImport: true,
    });

    expect(model?.surface).toBe('add-node-catalog');
    expect(model?.canvasActions).toEqual([]);
    expect(model?.catalogActions).toEqual([
      { action: 'open-source-import', label: 'Add source', registration: sourceKind },
      { action: 'create-node', label: 'Add model', registration: modelKind },
    ]);
  });

  it('does not build an add-node catalog from an edge context', () => {
    const model = buildCanvasAddNodeCatalogMenuModel({
      sourceModel: buildCanvasContextMenuModel({
        target: {
          kind: 'edge',
          edgeId: 'edge-source-model',
          screenPosition: { x: 480, y: 320 },
        },
        canMutateGraph: true,
        authoringNodeKinds: [buildTestNodeKind('dvt:source', 'Source')],
      }),
      authoringNodeKinds: [buildTestNodeKind('dvt:source', 'Source')],
    });

    expect(model).toBeNull();
  });

  it('does not expose validation or preview from the background root menu', () => {
    const model = buildCanvasContextMenuModel({
      target: {
        kind: 'pane',
        screenPosition: { x: 480, y: 320 },
        flowPosition: { x: 720, y: 180 },
      },
      canMutateGraph: true,
      authoringNodeKinds: [buildTestNodeKind('dvt:source', 'Source')],
    });

    expect(model.canvasActions).toEqual([{ action: 'open-add-node-catalog', label: 'Add...' }]);
    expect(model.createNodeActions).toEqual([]);
  });

  it('does not show add catalog when graph mutation is unavailable', () => {
    const model = buildCanvasContextMenuModel({
      target: {
        kind: 'pane',
        screenPosition: { x: 480, y: 320 },
        flowPosition: { x: 720, y: 180 },
      },
      canMutateGraph: false,
      authoringNodeKinds: [buildTestNodeKind('dvt:source', 'Source')],
    });

    expect(model.canvasActions).toEqual([]);
    expect(model.createNodeActions).toEqual([]);
    expect(model.edgeActions).toEqual([]);
  });

  it('offers only source import when file authority permits import but forbids graph mutation', () => {
    const sourceKind = buildTestNodeKind('dbt:source', 'Source');
    const modelKind = buildTestNodeKind('dbt:model', 'Model');
    const rootModel = buildCanvasContextMenuModel({
      target: {
        kind: 'pane',
        screenPosition: { x: 480, y: 320 },
        flowPosition: { x: 720, y: 180 },
      },
      canMutateGraph: false,
      canOpenSourceImport: true,
      authoringNodeKinds: [sourceKind, modelKind],
    });
    const catalogModel = buildCanvasAddNodeCatalogMenuModel({
      sourceModel: rootModel,
      authoringNodeKinds: [sourceKind, modelKind],
      canOpenSourceImport: true,
      canCreateAuthoringNodes: false,
    });

    expect(rootModel.canvasActions).toEqual([{ action: 'open-add-node-catalog', label: 'Add...' }]);
    expect(catalogModel?.catalogActions).toEqual([
      { action: 'open-source-import', label: 'Add source', registration: sourceKind },
    ]);
    expect(catalogModel?.createNodeActions).toEqual([]);
  });

  it('keeps project navigation out of the canvas menu while preserving canvas-local commands', () => {
    const model = buildCanvasContextMenuModel({
      target: {
        kind: 'pane',
        screenPosition: { x: 480, y: 320 },
        flowPosition: { x: 720, y: 180 },
      },
      canMutateGraph: true,
      canOpenCanvasSettings: true,
      authoringNodeKinds: [
        buildTestNodeKind('dvt:source', 'Source'),
        buildTestNodeKind('dvt:transform', 'Transform'),
        buildTestNodeKind('dvt:sink', 'Sink'),
      ],
    });

    expect(model.canvasActions).toEqual([
      { action: 'open-add-node-catalog', label: 'Add...' },
      { action: 'open-canvas-settings', label: 'Canvas properties' },
    ]);
    expect(model.createNodeActions).toEqual([]);
    expect(JSON.stringify(model)).not.toContain('Edit SQL');
    expect(JSON.stringify(model)).not.toContain('Properties');
    expect(JSON.stringify(model)).not.toContain('Inputs');
    expect(JSON.stringify(model)).not.toContain('Tests');
    expect(JSON.stringify(model)).not.toContain('Run from here');
    expect(JSON.stringify(model)).not.toContain('Duplicate');
    expect(JSON.stringify(model)).not.toContain('Delete');
  });

  it('uses role-level spatial add grammar for model, transformation, test and output nodes', () => {
    const modelKind = { ...buildTestNodeKind('dbt:model', 'Model'), role: 'transform' as const };
    const transformKind = {
      ...buildTestNodeKind('dvt:transform', 'Transform'),
      role: 'transform' as const,
    };
    const testKind = {
      ...buildTestNodeKind('dbt:test', 'Test'),
      role: 'check' as const,
      allowsOutgoing: false,
    };
    const outputKind = {
      ...buildTestNodeKind('dvt:sink', 'Sink'),
      role: 'output' as const,
      allowsIncoming: true,
      allowsOutgoing: false,
    };

    const model = buildCanvasAddNodeCatalogMenuModel({
      sourceModel: buildCanvasContextMenuModel({
        target: {
          kind: 'pane',
          screenPosition: { x: 480, y: 320 },
          flowPosition: { x: 720, y: 180 },
        },
        canMutateGraph: true,
        authoringNodeKinds: [modelKind, transformKind, testKind, outputKind],
      }),
      authoringNodeKinds: [modelKind, transformKind, testKind, outputKind],
    });

    expect(model?.createNodeActions.map((action) => action.label)).toEqual([
      'Add model',
      'Add transformation',
      'Add test',
      'Add output',
    ]);
    expect(model?.createNodeActions.map((action) => action.registration.kind)).toEqual([
      'dbt:model',
      'dvt:transform',
      'dbt:test',
      'dvt:sink',
    ]);
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
      edgeActions: [{ action: 'remove-edge', label: 'Remove connection' }],
    });

    expect(
      buildCanvasContextMenuModel({
        target: {
          kind: 'edge',
          edgeId: 'edge-source-model',
          screenPosition: { x: 600, y: 360 },
        },
        canMutateGraph: true,
        authoringNodeKinds: [],
        copy: resolveCanvasViewCopy('es'),
      }).edgeActions
    ).toEqual([{ action: 'remove-edge', label: 'Eliminar conexión' }]);
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
