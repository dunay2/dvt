import type { Node } from '@xyflow/react';
import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import { canvasViewCopy } from './copy';
import { dropCanonicalNode } from './canvasNodeDropAggregate';

function buildCanonicalNode(id: string, role: CanonicalNode['role']): CanonicalNode {
  return {
    id,
    name: id,
    pluginId: 'dvt',
    kind: role === 'input' ? 'dvt:source' : role === 'output' ? 'dvt:sink' : 'dvt:transform',
    role,
    status: 'idle',
    tags: [],
  };
}

describe('canvasNodeDropAggregate', () => {
  it('returns noop when dropping a node already present in the graph', () => {
    const canonicalNode = buildCanonicalNode('transform-node', 'transform');
    const currentNodes: Node[] = [
      { id: 'transform-node', data: { name: 'transform-node' }, position: { x: 0, y: 0 } },
    ];

    const result = dropCanonicalNode({
      canonicalNode,
      position: { x: 10, y: 20 },
      nodes: currentNodes,
      columnLevelLineageEnabled: false,
    });

    expect(result).toEqual({
      outcome: 'noop',
      reason: canvasViewCopy.nodeAlreadyOnCanvasMessage,
    });
  });
});
