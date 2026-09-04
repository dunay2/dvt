import { describe, expect, it } from 'vitest';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { assignLevels, bfsReachable, groupNodesByLevel, kindStyle } from './lineageModel';

function buildNode(overrides?: Partial<CanonicalNode>): CanonicalNode {
  return {
    id: 'n1',
    name: 'stg_orders',
    pluginId: 'dbt',
    kind: 'dbt:model',
    role: 'transform',
    status: 'success',
    tags: [],
    metadata: {},
    ...overrides,
  };
}

function buildEdge(overrides?: Partial<CanonicalEdge>): CanonicalEdge {
  return {
    id: 'e1',
    sourceId: 'n1',
    targetId: 'n2',
    relation: 'lineage',
    metadata: {},
    ...overrides,
  };
}

describe('lineageModel', () => {
  it('computes upstream/downstream reachability', () => {
    const edges = [buildEdge()];
    expect(bfsReachable('n1', edges, 'downstream').has('n2')).toBe(true);
    expect(bfsReachable('n2', edges, 'upstream').has('n1')).toBe(true);
  });

  it('assigns topological levels', () => {
    const nodes = [buildNode({ id: 'n1' }), buildNode({ id: 'n2' })];
    const edges = [buildEdge({ sourceId: 'n1', targetId: 'n2' })];
    const levels = assignLevels(nodes, edges);
    expect(levels.get('n1')).toBe(0);
    expect(levels.get('n2')).toBe(1);
  });

  it('returns default style for unknown kind', () => {
    const style = kindStyle('custom:kind');
    expect(style.badge).toBe('KIND');
  });

  it('groups nodes by calculated levels', () => {
    const nodes = [buildNode({ id: 'n1' }), buildNode({ id: 'n2' })];
    const levels = new Map<string, number>([
      ['n1', 0],
      ['n2', 1],
    ]);
    const grouped = groupNodesByLevel(nodes, levels);
    expect(grouped.map(([level]) => level)).toEqual([0, 1]);
  });
});
