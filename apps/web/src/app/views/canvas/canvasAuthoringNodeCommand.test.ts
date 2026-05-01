import type { Node } from '@xyflow/react';
import { describe, expect, it } from 'vitest';

import { buildTestNodeKind } from './canvasKindRegistration.testSupport';
import { buildAuthoringNodeCommand } from './canvasAuthoringNodeCommand';

describe('buildAuthoringNodeCommand', () => {
  it('starts empty canvases from the canonical origin', () => {
    const command = buildAuthoringNodeCommand(
      buildTestNodeKind('dvt:sql_transform', 'SQL transform'),
      []
    );

    expect(command.position).toEqual({ x: 0, y: 0 });
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
        data: { pluginKind: 'sql_transform' },
        position: { x: 320, y: 140 },
      },
      {
        id: 'orders_dashboard',
        data: { pluginKind: 'sink' },
        position: { x: 620, y: 140 },
      },
    ];

    const command = buildAuthoringNodeCommand(
      buildTestNodeKind('dvt:sql_transform', 'SQL transform'),
      existingNodes
    );

    expect(command.position).toEqual({ x: 320, y: 360 });
  });
});
