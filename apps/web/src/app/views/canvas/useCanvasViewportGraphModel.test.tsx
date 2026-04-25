// @vitest-environment jsdom

import { createElement } from 'react';
import { describe, expect, it } from 'vitest';

import { withTestQueryClient } from '../../../testing/reactQueryHarness';
import type { CanonicalNode } from '../../types/canonical';
import { buildCanvasAuthoringGraphProjection } from './canvasAuthoringGraphProjection';
import { useCanvasViewportGraphModel } from './useCanvasViewportGraphModel';

type ViewportGraphModelState = ReturnType<typeof useCanvasViewportGraphModel>;

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

async function renderViewportGraphModel(
  args: Parameters<typeof useCanvasViewportGraphModel>[0]
): Promise<{
  readState: () => ViewportGraphModelState | undefined;
  rerender: (nextArgs: Parameters<typeof useCanvasViewportGraphModel>[0]) => Promise<void>;
  cleanup: () => Promise<void>;
}> {
  let observedState: ViewportGraphModelState | undefined;
  let currentArgs = args;

  function ViewportGraphModelProbe(): null {
    observedState = useCanvasViewportGraphModel(currentArgs);
    return null;
  }

  const mounted = await withTestQueryClient(createElement(ViewportGraphModelProbe));

  return {
    readState: () => observedState,
    rerender: async (nextArgs) => {
      currentArgs = nextArgs;
      await mounted.render(createElement(ViewportGraphModelProbe));
    },
    cleanup: mounted.cleanup,
  };
}

describe('useCanvasViewportGraphModel', () => {
  it('projects visible canonical nodes and canonical edge ids into React Flow state', async () => {
    const authoringProjection = buildCanvasAuthoringGraphProjection({
      visibleNodeIds: ['source-node', 'transform-node', 'sink-node'],
      visibleEdges: [
        { sourceId: 'source-node', targetId: 'transform-node' },
        { sourceId: 'transform-node', targetId: 'sink-node' },
      ],
      draftSemanticGraph: {
        canonicalNodes: [
          buildCanonicalNode('source-node', 'dvt:source', 'input'),
          buildCanonicalNode('transform-node', 'dvt:sql_transform', 'transform'),
          buildCanonicalNode('sink-node', 'dvt:sink', 'output'),
        ],
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
        ],
      },
      localCanonicalNodes: [],
    });
    const mounted = await renderViewportGraphModel({
      visibleNodeIds: ['source-node', 'transform-node', 'sink-node'],
      visibleEdges: [
        { sourceId: 'source-node', targetId: 'transform-node' },
        { sourceId: 'transform-node', targetId: 'sink-node' },
      ],
      canonicalNodesById: authoringProjection.canonicalNodesById,
      canonicalEdgeIdBySignature: authoringProjection.canonicalEdgeIdBySignature,
      columnLevelLineageEnabled: false,
      persistedNodePositions: {},
    });

    try {
      expect(mounted.readState()?.nodes.map((node) => node.id)).toEqual([
        'source-node',
        'transform-node',
        'sink-node',
      ]);
      expect(mounted.readState()?.edges).toEqual([
        {
          id: 'draft_edge_source-node_transform-node',
          source: 'source-node',
          target: 'transform-node',
        },
        {
          id: 'draft_edge_transform-node_sink-node',
          source: 'transform-node',
          target: 'sink-node',
        },
      ]);
    } finally {
      await mounted.cleanup();
    }
  });

  it('creates visible fallback edge ids for locally admitted edges that are not yet persisted canonically', async () => {
    const authoringProjection = buildCanvasAuthoringGraphProjection({
      visibleNodeIds: ['source-node', 'transform-node', 'sink-node'],
      visibleEdges: [
        { sourceId: 'source-node', targetId: 'transform-node' },
        { sourceId: 'transform-node', targetId: 'sink-node' },
      ],
      draftSemanticGraph: {
        canonicalNodes: [
          buildCanonicalNode('source-node', 'dvt:source', 'input'),
          buildCanonicalNode('transform-node', 'dvt:sql_transform', 'transform'),
        ],
        canonicalEdges: [
          {
            id: 'draft_edge_source-node_transform-node',
            sourceId: 'source-node',
            targetId: 'transform-node',
            relation: 'lineage',
          },
        ],
      },
      localCanonicalNodes: [buildCanonicalNode('sink-node', 'dvt:sink', 'output')],
    });
    const mounted = await renderViewportGraphModel({
      visibleNodeIds: ['source-node', 'transform-node', 'sink-node'],
      visibleEdges: [
        { sourceId: 'source-node', targetId: 'transform-node' },
        { sourceId: 'transform-node', targetId: 'sink-node' },
      ],
      canonicalNodesById: authoringProjection.canonicalNodesById,
      canonicalEdgeIdBySignature: authoringProjection.canonicalEdgeIdBySignature,
      columnLevelLineageEnabled: false,
      persistedNodePositions: {},
    });

    try {
      expect(mounted.readState()?.edges).toEqual([
        {
          id: 'draft_edge_source-node_transform-node',
          source: 'source-node',
          target: 'transform-node',
        },
        {
          id: 'draft_edge_transform-node_sink-node',
          source: 'transform-node',
          target: 'sink-node',
        },
      ]);
    } finally {
      await mounted.cleanup();
    }
  });

  it('refreshes projected node data when canonical node details change', async () => {
    const initialProjection = buildCanvasAuthoringGraphProjection({
      visibleNodeIds: ['source-node'],
      visibleEdges: [],
      draftSemanticGraph: {
        canonicalNodes: [buildCanonicalNode('source-node', 'dvt:source', 'input')],
        canonicalEdges: [],
      },
      localCanonicalNodes: [],
    });
    const mounted = await renderViewportGraphModel({
      visibleNodeIds: ['source-node'],
      visibleEdges: [],
      canonicalNodesById: initialProjection.canonicalNodesById,
      canonicalEdgeIdBySignature: initialProjection.canonicalEdgeIdBySignature,
      columnLevelLineageEnabled: false,
      persistedNodePositions: {},
    });

    try {
      expect(mounted.readState()?.nodes[0]?.data.name).toBe('source-node');

      const updatedProjection = buildCanvasAuthoringGraphProjection({
        visibleNodeIds: ['source-node'],
        visibleEdges: [],
        draftSemanticGraph: {
          canonicalNodes: [buildCanonicalNode('source-node', 'dvt:source', 'input')],
          canonicalEdges: [],
        },
        localCanonicalNodes: [
          {
            ...buildCanonicalNode('source-node', 'dvt:source', 'input'),
            name: 'source-node-renamed',
            description: 'Edited in inspector',
          },
        ],
      });
      await mounted.rerender({
        visibleNodeIds: ['source-node'],
        visibleEdges: [],
        canonicalNodesById: updatedProjection.canonicalNodesById,
        canonicalEdgeIdBySignature: updatedProjection.canonicalEdgeIdBySignature,
        columnLevelLineageEnabled: false,
        persistedNodePositions: {},
      });

      expect(mounted.readState()?.nodes[0]?.data.name).toBe('source-node-renamed');
      expect(mounted.readState()?.nodes[0]?.data.description).toBe('Edited in inspector');
    } finally {
      await mounted.cleanup();
    }
  });
});
