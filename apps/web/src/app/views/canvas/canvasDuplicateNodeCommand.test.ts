import { describe, expect, it } from 'vitest';

import {
  buildDuplicateNodeCommand,
  resolveCanvasNodeDuplicateTransaction,
} from './canvasDuplicateNodeCommand';

describe('canvasDuplicateNodeCommand', () => {
  it('rejects malformed semantic authority before admitting a duplicate', () => {
    const sourceCanonicalNode = {
      id: 'broken-transform',
      name: 'Broken',
      pluginId: 'dvt',
      kind: 'dvt:transform',
      role: 'transform',
      status: 'idle',
      tags: [],
      metadata: { transformAuthoring: { version: 'invalid' } },
    } as const;
    expect(
      resolveCanvasNodeDuplicateTransaction({
        nodeId: sourceCanonicalNode.id,
        sourceCanonicalNode: { ...sourceCanonicalNode, tags: [] },
        existingNodes: [{ id: sourceCanonicalNode.id, position: { x: 0, y: 0 } }],
        visibleNodeIds: [sourceCanonicalNode.id],
      })
    ).toEqual({ outcome: 'noop', reason: 'invalid_semantic_authority' });
  });
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

  it('does not crash duplicate commands when plugin metadata contains non-cloneable fields', () => {
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
        tags: [],
        metadata: {
          config: {
            schema: 'raw',
          },
          onInspect: () => 'not serializable',
        },
      },
      existingNodes: [
        {
          id: 'source-node',
          position: { x: 40, y: 80 },
          data: {},
        },
      ],
    });

    expect(duplicate.canonicalNode.metadata).toEqual({
      config: {
        schema: 'raw',
      },
    });
  });

  it('drops circular metadata links from duplicate commands while preserving JSON-like metadata', () => {
    const metadata: Record<string, unknown> = {
      config: {
        schema: 'raw',
      },
    };
    metadata.self = metadata;

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
        tags: [],
        metadata,
      },
      existingNodes: [
        {
          id: 'source-node',
          position: { x: 40, y: 80 },
          data: {},
        },
      ],
    });

    expect(duplicate.canonicalNode.metadata).toEqual({
      config: {
        schema: 'raw',
      },
    });
  });

  it('resolves duplicate graph fallout as a pure transaction', () => {
    const transaction = resolveCanvasNodeDuplicateTransaction({
      nodeId: 'source-node',
      sourceCanonicalNode: {
        id: 'source-node',
        name: 'Orders source',
        pluginId: 'dvt',
        kind: 'dvt:source',
        role: 'input',
        status: 'success',
        tags: [],
      },
      existingNodes: [
        {
          id: 'source-node',
          position: { x: 40, y: 80 },
          data: {
            role: 'input',
          },
        },
      ],
      visibleNodeIds: ['source-node'],
    });

    expect(transaction).toEqual({
      outcome: 'added',
      canonicalNode: expect.objectContaining({
        id: 'source-node-copy-1',
        name: 'Orders source (copy 1)',
      }),
      position: { x: 88, y: 128 },
    });
  });
});
