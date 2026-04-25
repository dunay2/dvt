import { describe, expect, it } from 'vitest';

import { buildDuplicateNodeCommand } from './canvasDuplicateNodeCommand';

describe('canvasDuplicateNodeCommand', () => {
  it('builds a new node identity, resets runtime status, and displaces position', () => {
    const duplicate = buildDuplicateNodeCommand({
      sourceNode: {
        id: 'source-node',
        position: { x: 40, y: 80 },
        data: {},
      },
      sourceCanonicalNode: {
        id: 'source-node',
        name: 'Orders source',
        pluginId: 'dvt',
        kind: 'dvt:source',
        role: 'input',
        status: 'success',
        tags: ['authoring', 'critical'],
        path: 'models/orders.sql',
        description: 'Primary source node',
        metadata: {
          config: {
            schema: 'raw',
            table: 'orders',
          },
        },
        lastDuration: 320,
        lastCost: 18,
      },
      existingNodes: [
        {
          id: 'source-node',
          position: { x: 40, y: 80 },
          data: {},
        },
        {
          id: 'source-node-copy-1',
          position: { x: 88, y: 128 },
          data: {},
        },
      ],
    });

    expect(duplicate).toEqual({
      canonicalNode: {
        id: 'source-node-copy-2',
        name: 'Orders source (copy 2)',
        pluginId: 'dvt',
        kind: 'dvt:source',
        role: 'input',
        status: 'idle',
        tags: ['authoring', 'critical'],
        path: 'models/orders.sql',
        description: 'Primary source node',
        metadata: {
          config: {
            schema: 'raw',
            table: 'orders',
          },
        },
      },
      position: {
        x: 136,
        y: 176,
      },
    });
  });
});
