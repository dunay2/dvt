import { describe, expect, it } from 'vitest';

import type { CanvasGraphStrategy } from '../../plugins/graphStrategyContracts';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { projectLineageGraph } from './useLineageViewData';

const canonicalNode: CanonicalNode = {
  id: 'node-1',
  name: 'Node 1',
  pluginId: 'dbt',
  kind: 'dbt:model',
  role: 'transform',
  status: 'idle',
  tags: [],
};

const canonicalEdge: CanonicalEdge = {
  id: 'edge-1',
  sourceId: 'node-1',
  targetId: 'node-2',
  relation: 'lineage',
};

function strategy(overrides: Partial<CanvasGraphStrategy> = {}): CanvasGraphStrategy {
  return {
    id: 'test',
    mapNodeToCanonical: () => canonicalNode,
    mapEdgeToCanonical: () => canonicalEdge,
    parseDropPayload: () => null,
    ...overrides,
  };
}

describe('Lineage graph projection', () => {
  it('discards all projected nodes and edges when a node mapper throws', () => {
    let nodeCalls = 0;
    const result = projectLineageGraph(
      [{ id: 'healthy-node' }, { id: 'failing-node' }],
      [{ id: 'edge-1' }],
      strategy({
        mapNodeToCanonical: () => {
          nodeCalls += 1;
          if (nodeCalls === 2) throw new Error('node mapping failed');
          return canonicalNode;
        },
      })
    );

    expect(result.canonicalNodes).toEqual([]);
    expect(result.canonicalEdges).toEqual([]);
    expect(result.projectionError?.message).toBe('node mapping failed');
  });

  it('discards all projected nodes and edges when an edge mapper throws', () => {
    let edgeCalls = 0;
    const result = projectLineageGraph(
      [{ id: 'node-1' }],
      [{ id: 'healthy-edge' }, { id: 'failing-edge' }],
      strategy({
        mapEdgeToCanonical: () => {
          edgeCalls += 1;
          if (edgeCalls === 2) throw new Error('edge mapping failed');
          return canonicalEdge;
        },
      })
    );

    expect(result.canonicalNodes).toEqual([]);
    expect(result.canonicalEdges).toEqual([]);
    expect(result.projectionError?.message).toBe('edge mapping failed');
  });

  it('filters normal null mapper results without producing an error', () => {
    const result = projectLineageGraph(
      [{ id: 'ignored-node' }],
      [{ id: 'ignored-edge' }],
      strategy({ mapNodeToCanonical: () => null, mapEdgeToCanonical: () => null })
    );

    expect(result).toEqual({ canonicalNodes: [], canonicalEdges: [], projectionError: null });
  });
});
