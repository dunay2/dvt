import type { Node } from '@xyflow/react';
import { describe, expect, it } from 'vitest';

import { buildTestNodeKind } from './canvasKindRegistration.testSupport';
import { buildAuthoringNodeCommand } from './canvasAuthoringNodeCommand';

describe('buildAuthoringNodeCommand', () => {
  it('starts empty canvases from the first visible authoring slot', () => {
    const command = buildAuthoringNodeCommand(buildTestNodeKind('dvt:transform', 'Transform'), []);

    expect(command.position).toEqual({ x: 160, y: 120 });
  });

  it('places catalog-created nodes in the matching loaded graph column instead of resetting to origin', () => {
    const existingNodes: Node[] = [
      {
        id: 'src_orders',
        data: { pluginKind: 'source' },
        position: { x: 40, y: 140 },
      },
      {
        id: 'model_orders',
        data: { pluginKind: 'transform' },
        position: { x: 320, y: 140 },
      },
      {
        id: 'orders_dashboard',
        data: { pluginKind: 'sink' },
        position: { x: 620, y: 140 },
      },
    ];

    const command = buildAuthoringNodeCommand(
      buildTestNodeKind('dvt:transform', 'Transform'),
      existingNodes
    );

    expect(command.position).toEqual({ x: 320, y: 360 });
  });

  it('uses a caller-owned viewport position for context-menu node creation', () => {
    const command = buildAuthoringNodeCommand(buildTestNodeKind('dvt:source', 'Source'), [], {
      x: 960,
      y: 420,
    });

    expect(command.position).toEqual({ x: 960, y: 420 });
  });

  it('applies governed template seed metadata while preserving the node kind identity', () => {
    const command = buildAuthoringNodeCommand(
      {
        ...buildTestNodeKind('dvt:transform', 'Transform'),
        role: 'transform',
        allowsIncoming: true,
      },
      [],
      undefined,
      {
        namePrefix: 'Filter rows',
        tags: ['template:filter-rows'],
        metadata: {
          transformationTemplateId: 'filter-rows',
          sql: 'select * from {{ source }} where {{ condition }}',
          config: {
            sql: 'select * from {{ source }} where {{ condition }}',
          },
        },
      }
    );

    expect(command.canonicalNode).toMatchObject({
      id: 'dvt-transform-1',
      name: 'Filter rows 1',
      pluginId: 'dvt',
      kind: 'dvt:transform',
      role: 'transform',
      tags: ['authoring', 'template:filter-rows'],
      metadata: {
        typeLabel: 'Transform',
        transformationTemplateId: 'filter-rows',
        sql: 'select * from {{ source }} where {{ condition }}',
        config: {
          sql: 'select * from {{ source }} where {{ condition }}',
        },
      },
    });
  });

  it('applies explicit output target seed metadata while preserving sink identity', () => {
    const command = buildAuthoringNodeCommand(
      {
        ...buildTestNodeKind('dvt:sink', 'Sink'),
        role: 'output',
        allowsIncoming: true,
        allowsOutgoing: false,
      },
      [],
      undefined,
      {
        namePrefix: 'Reporting view',
        tags: ['target:reporting-view-replace'],
        metadata: {
          outputTargetTemplateId: 'reporting-view-replace',
          config: {
            schema: 'reporting',
            table: 'transformed_view',
            materialization: 'view',
            writeMode: 'replace',
          },
        },
      }
    );

    expect(command.canonicalNode).toMatchObject({
      id: 'dvt-sink-1',
      name: 'Reporting view 1',
      pluginId: 'dvt',
      kind: 'dvt:sink',
      role: 'output',
      tags: ['authoring', 'target:reporting-view-replace'],
      metadata: {
        typeLabel: 'Sink',
        outputTargetTemplateId: 'reporting-view-replace',
        config: {
          schema: 'reporting',
          table: 'transformed_view',
          materialization: 'view',
          writeMode: 'replace',
        },
      },
    });
  });
});
