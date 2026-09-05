// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { buildTestNodeKind } from './canvasKindRegistration.testSupport';
import {
  buildCanvasAddNodeCatalogMenuModel,
  buildCanvasContextMenuModel,
} from './canvasInteractionCommandSurface';
import { buildCanvasContextMenuSections } from './canvasContextMenuViewModel';
import { resolveCanvasViewCopy } from './copy';

describe('canvasContextMenuViewModel', () => {
  it('groups background root actions without rendering the node-type catalog inline', () => {
    const model = buildCanvasContextMenuModel({
      target: {
        kind: 'pane',
        screenPosition: { x: 320, y: 180 },
        flowPosition: { x: 220, y: 90 },
      },
      canMutateGraph: true,
      canOpenCanvasSettings: true,
      authoringNodeKinds: [
        buildTestNodeKind('dbt:model', 'Model'),
        buildTestNodeKind('dvt:transform', 'Transform'),
      ],
    });

    const sections = buildCanvasContextMenuSections(model);

    expect(sections).toEqual([
      {
        id: 'add',
        items: [
          {
            id: 'canvas:open-add-node-catalog',
            label: 'Add...',
            kind: 'canvas',
            action: { action: 'open-add-node-catalog', label: 'Add...' },
          },
        ],
      },
      {
        id: 'canvas',
        title: 'Canvas',
        items: [
          {
            id: 'canvas:open-canvas-settings',
            label: 'Canvas properties',
            kind: 'canvas',
            action: { action: 'open-canvas-settings', label: 'Canvas properties' },
          },
        ],
      },
    ]);
  });

  it('groups add-node catalog entries only after the add catalog action is selected', () => {
    const modelKind = buildTestNodeKind('dbt:model', 'Model');
    const transformKind = buildTestNodeKind('dvt:transform', 'Transform');
    const model = buildCanvasContextMenuModel({
      target: {
        kind: 'pane',
        screenPosition: { x: 320, y: 180 },
        flowPosition: { x: 220, y: 90 },
      },
      canMutateGraph: true,
      authoringNodeKinds: [modelKind, transformKind],
    });
    const catalogModel = buildCanvasAddNodeCatalogMenuModel({
      sourceModel: model,
      authoringNodeKinds: [modelKind, transformKind],
    });
    if (catalogModel == null) {
      throw new Error('Expected pane root model to build an add-node catalog model.');
    }

    const sections = buildCanvasContextMenuSections(catalogModel);

    expect(sections).toEqual([
      {
        id: 'add',
        items: [
          {
            id: 'create-node:dbt:model',
            label: 'Add model',
            kind: 'catalog',
            action: catalogModel.catalogActions[0],
          },
          {
            id: 'create-node:dvt:transform',
            label: 'Add transformation',
            kind: 'catalog',
            action: catalogModel.catalogActions[1],
          },
        ],
      },
    ]);
  });

  it('projects the Canvas section title from the active copy contract', () => {
    const copy = {
      ...resolveCanvasViewCopy('en'),
      canvasContextMenuCanvasGroupLabel: 'Active graph',
    };
    const model = buildCanvasContextMenuModel({
      target: {
        kind: 'pane',
        screenPosition: { x: 320, y: 180 },
        flowPosition: { x: 220, y: 90 },
      },
      canMutateGraph: true,
      canOpenCanvasSettings: true,
      authoringNodeKinds: [],
      copy,
    });

    expect(buildCanvasContextMenuSections(model, copy)[0]?.title).toBe('Active graph');
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
            label: 'Remove connection',
            kind: 'edge',
            action: { action: 'remove-edge', label: 'Remove connection' },
          },
        ],
      },
    ]);
  });
});
