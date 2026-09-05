import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { describe, expect, it } from 'vitest';

import {
  buildDbtProjectFileInitialNodePositions,
  DBT_PROJECT_FILE_LAYOUT_NODE_SIZE,
  mergeDbtProjectFileNodePositions,
} from './dbtProjectFileLayout';

function node(id: string): CanonicalNode {
  return {
    id,
    name: id,
    pluginId: 'dvt',
    kind: 'dvt:transform',
    role: 'transform',
    status: 'idle',
    tags: [],
  };
}

function edge(id: string, sourceId: string, targetId: string): CanonicalEdge {
  return { id, sourceId, targetId, relation: 'lineage' };
}

function overlaps(left: { x: number; y: number }, right: { x: number; y: number }): boolean {
  return !(
    left.x + DBT_PROJECT_FILE_LAYOUT_NODE_SIZE.width <= right.x ||
    right.x + DBT_PROJECT_FILE_LAYOUT_NODE_SIZE.width <= left.x ||
    left.y + DBT_PROJECT_FILE_LAYOUT_NODE_SIZE.height <= right.y ||
    right.y + DBT_PROJECT_FILE_LAYOUT_NODE_SIZE.height <= left.y
  );
}

function requirePosition(
  positions: Record<string, { x: number; y: number }>,
  nodeId: string
): { x: number; y: number } {
  const position = positions[nodeId];
  if (position == null) {
    throw new Error(`Missing test layout position for ${nodeId}`);
  }
  return position;
}

describe('dbt project file layout', () => {
  it('places every projected resource without card overlap and advances dependencies', () => {
    const nodes = ['source', 'seed', 'model', 'snapshot', 'test', 'exposure'].map(node);
    const positions = buildDbtProjectFileInitialNodePositions(nodes, [
      edge('source-model', 'source', 'model'),
      edge('model-snapshot', 'model', 'snapshot'),
      edge('model-test', 'model', 'test'),
      edge('model-exposure', 'model', 'exposure'),
    ]);

    expect(Object.keys(positions)).toEqual(nodes.map(({ id }) => id));
    expect(requirePosition(positions, 'model').x).toBeGreaterThan(
      requirePosition(positions, 'source').x
    );
    expect(requirePosition(positions, 'snapshot').x).toBeGreaterThan(
      requirePosition(positions, 'model').x
    );

    for (const [index, left] of nodes.entries()) {
      for (const right of nodes.slice(index + 1)) {
        expect(
          overlaps(requirePosition(positions, left.id), requirePosition(positions, right.id)),
          `${left.id}/${right.id}`
        ).toBe(false);
      }
    }
  });

  it('keeps user-positioned nodes authoritative over regenerated defaults', () => {
    const positions = mergeDbtProjectFileNodePositions(
      { source: { x: 0, y: 0 }, model: { x: 560, y: 0 } },
      { model: { x: 940, y: 320 } }
    );

    expect(positions).toEqual({
      source: { x: 0, y: 0 },
      model: { x: 940, y: 320 },
    });
  });
});
