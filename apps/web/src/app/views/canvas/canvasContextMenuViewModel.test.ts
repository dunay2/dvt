import { describe, expect, it } from 'vitest';

import { buildTestNodeKind } from './canvasKindRegistration.testSupport';
import { buildCanvasContextMenuModel } from './canvasInteractionCommandSurface';
import { buildCanvasContextMenuSections } from './canvasContextMenuViewModel';

describe('canvasContextMenuViewModel', () => {
  it('groups pane actions into Add and Canvas sections without leaking callback policy into the view', () => {
    const model = buildCanvasContextMenuModel({
      target: {
        kind: 'pane',
        screenPosition: { x: 320, y: 180 },
        flowPosition: { x: 220, y: 90 },
      },
      canMutateGraph: true,
      canOpenSourceImport: true,
      canValidateGraph: true,
      canPreviewExecutionPlan: true,
      canOpenCanvasSettings: true,
      authoringNodeKinds: [
        buildTestNodeKind('dbt:model', 'Model'),
        buildTestNodeKind('dvt:sql_transform', 'SQL transform'),
      ],
    });

    const sections = buildCanvasContextMenuSections(model);

    expect(sections).toEqual([
      {
        id: 'add',
        title: 'Add',
        items: [
          {
            id: 'canvas:open-source-import',
            label: 'Add source',
            kind: 'canvas',
            action: { action: 'open-source-import', label: 'Add source' },
          },
          {
            id: 'create-node:dbt:model',
            label: 'Add model',
            kind: 'create-node',
            action: model.createNodeActions[0],
          },
          {
            id: 'create-node:dvt:sql_transform',
            label: 'Add transformation',
            kind: 'create-node',
            action: model.createNodeActions[1],
          },
        ],
      },
      {
        id: 'canvas',
        title: 'Canvas',
        items: [
          {
            id: 'canvas:validate-graph',
            label: 'Validate graph',
            kind: 'canvas',
            action: { action: 'validate-graph', label: 'Validate graph' },
          },
          {
            id: 'canvas:preview-execution-plan',
            label: 'Preview execution plan',
            kind: 'canvas',
            action: { action: 'preview-execution-plan', label: 'Preview execution plan' },
          },
          {
            id: 'canvas:open-canvas-settings',
            label: 'Canvas settings',
            kind: 'canvas',
            action: { action: 'open-canvas-settings', label: 'Canvas settings' },
          },
        ],
      },
    ]);
  });

  it('keeps edge actions in an edge-only section', () => {
    const model = buildCanvasContextMenuModel({
      target: {
        kind: 'edge',
        edgeId: 'edge-source-model',
        screenPosition: { x: 600, y: 360 },
      },
      canMutateGraph: true,
      authoringNodeKinds: [],
    });

    expect(buildCanvasContextMenuSections(model)).toEqual([
      {
        id: 'edge',
        items: [
          {
            id: 'edge:remove-edge',
            label: 'Eliminar conexión',
            kind: 'edge',
            action: { action: 'remove-edge', label: 'Eliminar conexión' },
          },
        ],
      },
    ]);
  });
});
