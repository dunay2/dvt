import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import { readArchitectureSiblingSource } from '../architecture.test.support';
import { canvasViewCopy } from './copy';
import { admitCanonicalNodeToCanvas } from './canvasNodeDropAggregate';

const NODE_DROP_AGGREGATE_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasNodeDropAggregate.ts'
);

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
  it('stays independent from viewport projection concerns', () => {
    expect(NODE_DROP_AGGREGATE_SOURCE).not.toContain('@xyflow/react');
    expect(NODE_DROP_AGGREGATE_SOURCE).not.toContain('mapDroppedCanonicalNodeToCanvasNode');
  });

  it('returns noop when admitting a node already present in the semantic draft', () => {
    const canonicalNode = buildCanonicalNode('transform-node', 'transform');

    const result = admitCanonicalNodeToCanvas({
      canonicalNode,
      visibleNodeIds: ['transform-node'],
    });

    expect(result).toEqual({
      outcome: 'noop',
      reason: canvasViewCopy.nodeAlreadyOnCanvasMessage,
    });
  });

  it('admits a new canonical node without projecting viewport nodes', () => {
    const canonicalNode = buildCanonicalNode('transform-node', 'transform');

    expect(
      admitCanonicalNodeToCanvas({
        canonicalNode,
        visibleNodeIds: ['source-node'],
      })
    ).toEqual({
      outcome: 'added',
      canonicalNode,
    });
  });
});
