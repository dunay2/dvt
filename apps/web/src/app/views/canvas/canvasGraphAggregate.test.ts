import type { Connection, Edge, Node } from '@xyflow/react';
import { describe, expect, it } from 'vitest';

import type { CanvasGraphStrategy } from '../../plugins/dbt/dbtNodeAdapter';
import type { CanonicalNode } from '../../types/canonical';
import {
  confirmConnection,
  dropCanonicalNode,
  removeEdgesForNode,
  removeNodeFromGraph,
} from './canvasGraphAggregate';

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

function buildStrategy(id: CanvasGraphStrategy['id'] = 'transformation'): CanvasGraphStrategy {
  return {
    id,
    mapNodeToCanonical: () => null,
    mapEdgeToCanonical: () => null,
    parseDropPayload: () => null,
  };
}

describe('canvasGraphAggregate', () => {
  it('revalidates and rejects duplicate edges at confirmation time', () => {
    const sourceNode = buildCanonicalNode('source-node', 'input');
    const targetNode = buildCanonicalNode('sink-node', 'output');
    const canonicalNodesById = new Map([
      [sourceNode.id, sourceNode],
      [targetNode.id, targetNode],
    ]);
    const connection: Connection = {
      source: sourceNode.id,
      sourceHandle: null,
      target: targetNode.id,
      targetHandle: null,
    };
    const existingEdges: Edge[] = [
      { id: 'edge-1', source: sourceNode.id, target: targetNode.id },
    ];

    const result = confirmConnection({
      connection,
      canonicalNodesById,
      edges: existingEdges,
      pluginPortMap: new Map(),
    });

    expect(result).toEqual({
      outcome: 'rejected',
      reason: 'Connection already exists',
    });
  });

  it('returns noop when dropping a node already present in the graph', () => {
    const canonicalNode = buildCanonicalNode('transform-node', 'transform');
    const currentNodes: Node[] = [
      { id: 'transform-node', data: { name: 'transform-node' }, position: { x: 0, y: 0 } },
    ];

    const result = dropCanonicalNode({
      canonicalNode,
      position: { x: 10, y: 20 },
      nodes: currentNodes,
      graphStrategy: buildStrategy(),
      columnLevelLineageEnabled: false,
    });

    expect(result).toEqual({
      outcome: 'noop',
      reason: 'Node already on canvas',
    });
  });

  it('removes graph edges linked to a deleted node', () => {
    const edges: Edge[] = [
      { id: 'edge-1', source: 'source-node', target: 'sink-node' },
      { id: 'edge-2', source: 'sink-node', target: 'source-node' },
      { id: 'edge-3', source: 'other-node', target: 'third-node' },
    ];

    expect(removeEdgesForNode(edges, 'source-node')).toEqual([
      { id: 'edge-3', source: 'other-node', target: 'third-node' },
    ]);
  });

  it('removes nodes and returns node metadata for user feedback', () => {
    const nodes: Node[] = [
      { id: 'source-node', data: { name: 'source' }, position: { x: 0, y: 0 } },
      { id: 'sink-node', data: { name: 'sink' }, position: { x: 1, y: 1 } },
    ];

    expect(removeNodeFromGraph(nodes, 'source-node')).toEqual({
      outcome: 'removed',
      nextNodes: [{ id: 'sink-node', data: { name: 'sink' }, position: { x: 1, y: 1 } }],
      nodeName: 'source',
    });
  });
});
