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

  it('keeps source creation behind the source import rail to avoid duplicate canvas actions', () => {
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
    expect(model.createNodeActions).toEqual([]);
  });

  it('offers execution preview from the canvas menu independently from graph mutation', () => {
    const model = buildCanvasContextMenuModel({
      target: {
        kind: 'pane',
        screenPosition: { x: 480, y: 320 },
        flowPosition: { x: 720, y: 180 },
      },
      canMutateGraph: false,
      canValidateGraph: true,
      canPreviewExecutionPlan: true,
      authoringNodeKinds: [buildTestNodeKind('dvt:source', 'Source')],
    });

    expect(model.canvasActions).toEqual([
      { action: 'validate-graph', label: 'Validate graph' },
      { action: 'preview-execution-plan', label: 'Preview execution plan' },
    ]);
    expect(model.createNodeActions).toEqual([]);
    expect(model.edgeActions).toEqual([]);
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
      canValidateGraph: true,
      canPreviewExecutionPlan: true,
      authoringNodeKinds: [
        buildTestNodeKind('dvt:source', 'Source'),
        buildTestNodeKind('dvt:sql_transform', 'SQL transform'),
        buildTestNodeKind('dvt:sink', 'Sink'),
      ],
    });

    expect(model.canvasActions).toEqual([
      { action: 'validate-graph', label: 'Validate graph' },
      { action: 'preview-execution-plan', label: 'Preview execution plan' },
      { action: 'open-canvas-settings', label: 'Canvas settings' },
    ]);
    expect(model.createNodeActions.map((action) => action.label)).toEqual([
      'Add source',
      'Add transformation',
      'Add output',
    ]);
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
      ...buildTestNodeKind('dvt:sql_transform', 'SQL transform'),
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

    const model = buildCanvasContextMenuModel({
      target: {
        kind: 'pane',
        screenPosition: { x: 480, y: 320 },
        flowPosition: { x: 720, y: 180 },
      },
      canMutateGraph: true,
      authoringNodeKinds: [modelKind, transformKind, testKind, outputKind],
    });

    expect(model.createNodeActions.map((action) => action.label)).toEqual([
      'Add model',
      'Add transformation',
      'Add test',
      'Add output',
    ]);
    expect(model.createNodeActions.map((action) => action.registration.kind)).toEqual([
      'dbt:model',
      'dvt:sql_transform',
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
