import { describe, expect, it } from 'vitest';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { buildCanvasAuthoringGraphProjection } from './canvasAuthoringGraphProjection';

function buildCanonicalNode(
  id: string,
  kind: CanonicalNode['kind'],
  role: CanonicalNode['role']
): CanonicalNode {
  return {
    id,
    name: id,
    pluginId: kind.split(':', 1)[0] ?? 'dvt',
    kind,
    role,
    status: 'idle',
    tags: [],
  };
}

describe('buildCanvasAuthoringGraphProjection', () => {
  it('overlays route-local node overrides onto protected draft semantics when node ids match', () => {
    const protectedSemanticGraph = {
      canonicalNodes: [
        buildCanonicalNode('source-node', 'dvt:source', 'input'),
        buildCanonicalNode('transform-node', 'dvt:transform', 'transform'),
        buildCanonicalNode('sink-node', 'dvt:sink', 'output'),
      ] satisfies CanonicalNode[],
      canonicalEdges: [
        {
          id: 'draft_edge_source-node_transform-node',
          sourceId: 'source-node',
          targetId: 'transform-node',
          relation: 'lineage',
        },
        {
          id: 'draft_edge_transform-node_sink-node',
          sourceId: 'transform-node',
          targetId: 'sink-node',
          relation: 'lineage',
        },
      ] satisfies CanonicalEdge[],
    };

    const projection = buildCanvasAuthoringGraphProjection({
      visibleNodeIds: ['source-node', 'transform-node', 'sink-node'],
      visibleEdges: [
        { sourceId: 'source-node', targetId: 'transform-node' },
        { sourceId: 'transform-node', targetId: 'sink-node' },
      ],
      draftSemanticGraph: protectedSemanticGraph,
      localCanonicalNodes: [
        {
          ...buildCanonicalNode('sink-node', 'dvt:transform', 'transform'),
          pluginId: 'dvt',
          name: 'edited-sink',
          description: 'edited description',
        },
      ],
    });

    expect(projection.canonicalNodes.map((node) => node.id)).toEqual([
      'source-node',
      'transform-node',
      'sink-node',
    ]);
    expect(projection.canonicalEdges.map((edge) => edge.id)).toEqual([
      'draft_edge_source-node_transform-node',
      'draft_edge_transform-node_sink-node',
    ]);
    expect(projection.canonicalNodesById.get('sink-node')).toEqual(
      expect.objectContaining({
        id: 'sink-node',
        pluginId: 'dvt',
        kind: 'dvt:transform',
        name: 'edited-sink',
        description: 'edited description',
      })
    );
    expect(projection.canonicalEdgeIdBySignature.get('transform-node::sink-node')).toBe(
      'draft_edge_transform-node_sink-node'
    );
  });

  it('supplements protected semantics only with explicitly admitted local nodes and visible edges', () => {
    const protectedSemanticGraph = {
      canonicalNodes: [
        buildCanonicalNode('source-node', 'dvt:source', 'input'),
        buildCanonicalNode('transform-node', 'dvt:transform', 'transform'),
      ] satisfies CanonicalNode[],
      canonicalEdges: [
        {
          id: 'draft_edge_source-node_transform-node',
          sourceId: 'source-node',
          targetId: 'transform-node',
          relation: 'lineage',
        },
      ] satisfies CanonicalEdge[],
    };

    const projection = buildCanvasAuthoringGraphProjection({
      visibleNodeIds: ['source-node', 'transform-node', 'sink-node'],
      visibleEdges: [
        { sourceId: 'source-node', targetId: 'transform-node' },
        { sourceId: 'transform-node', targetId: 'sink-node' },
      ],
      draftSemanticGraph: protectedSemanticGraph,
      localCanonicalNodes: [buildCanonicalNode('sink-node', 'dvt:sink', 'output')],
    });

    expect(projection.canonicalNodes.map((node) => node.id)).toEqual([
      'source-node',
      'transform-node',
      'sink-node',
    ]);
    expect(projection.canonicalEdges).toEqual([
      expect.objectContaining({
        id: 'draft_edge_source-node_transform-node',
        sourceId: 'source-node',
        targetId: 'transform-node',
      }),
      expect.objectContaining({
        id: 'draft_edge_transform-node_sink-node',
        sourceId: 'transform-node',
        targetId: 'sink-node',
      }),
    ]);
  });
});
