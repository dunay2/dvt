// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import {
  buildCanonicalNode,
  buildViewportGraphModelArgs,
  renderViewportGraphModel,
} from './useCanvasViewportGraphModel.test.support';
import { readCanvasDependencyEdgeData } from './canvasDependencyEdgeModel';

describe('useCanvasViewportGraphModel edges', () => {
  it('projects visible canonical nodes and canonical edge ids into React Flow state', async () => {
    const mounted = await renderViewportGraphModel(
      buildViewportGraphModelArgs({
        visibleNodeIds: ['source-node', 'transform-node', 'sink-node'],
        visibleEdges: [
          { sourceId: 'source-node', targetId: 'transform-node' },
          { sourceId: 'transform-node', targetId: 'sink-node' },
        ],
        draftSemanticGraph: {
          canonicalNodes: [
            buildCanonicalNode('source-node', 'dvt:source', 'input'),
            buildCanonicalNode('transform-node', 'dvt:transform', 'transform'),
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
      })
    );

    try {
      expect(mounted.readState()?.nodes.map((node) => node.id)).toEqual([
        'source-node',
        'transform-node',
        'sink-node',
      ]);
      expect(mounted.readState()?.edges).toMatchObject([
        {
          id: 'draft_edge_source-node_transform-node',
          source: 'source-node',
          target: 'transform-node',
          type: 'dependency',
          interactionWidth: 18,
        },
        {
          id: 'draft_edge_transform-node_sink-node',
          source: 'transform-node',
          target: 'sink-node',
          type: 'dependency',
          interactionWidth: 18,
        },
      ]);
    } finally {
      await mounted.cleanup();
    }
  });

  it('creates visible fallback edge ids for locally admitted edges that are not persisted yet', async () => {
    const mounted = await renderViewportGraphModel(
      buildViewportGraphModelArgs({
        visibleNodeIds: ['source-node', 'transform-node', 'sink-node'],
        visibleEdges: [
          { sourceId: 'source-node', targetId: 'transform-node' },
          { sourceId: 'transform-node', targetId: 'sink-node' },
        ],
        draftSemanticGraph: {
          canonicalNodes: [
            buildCanonicalNode('source-node', 'dvt:source', 'input'),
            buildCanonicalNode('transform-node', 'dvt:transform', 'transform'),
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
      })
    );

    try {
      expect(mounted.readState()?.edges).toMatchObject([
        {
          id: 'draft_edge_source-node_transform-node',
          source: 'source-node',
          target: 'transform-node',
          type: 'dependency',
          interactionWidth: 18,
        },
        {
          id: 'draft_edge_transform-node_sink-node',
          source: 'transform-node',
          target: 'sink-node',
          type: 'dependency',
          interactionWidth: 18,
        },
      ]);
    } finally {
      await mounted.cleanup();
    }
  });

  it('projects the persisted gate into one typed React Flow edge read model', async () => {
    const mounted = await renderViewportGraphModel(
      buildViewportGraphModelArgs({
        visibleNodeIds: ['source-node', 'transform-node'],
        visibleEdges: [
          { sourceId: 'source-node', targetId: 'transform-node', executionGate: 'closed' },
        ],
        draftSemanticGraph: {
          canonicalNodes: [
            buildCanonicalNode('source-node', 'dvt:source', 'input'),
            buildCanonicalNode('transform-node', 'dvt:transform', 'transform'),
          ],
          canonicalEdges: [
            {
              id: 'source-transform',
              sourceId: 'source-node',
              targetId: 'transform-node',
              relation: 'lineage',
              metadata: { executionGate: 'closed' },
            },
          ],
        },
      })
    );

    try {
      const edge = mounted.readState()?.edges[0];
      const data = readCanvasDependencyEdgeData(edge?.data);

      expect(data?.execution).toMatchObject({
        gateState: 'closed',
        isGateable: true,
        isEffectivelyExecutable: false,
      });
      expect(edge?.ariaLabel).toContain('Excluded from execution');
    } finally {
      await mounted.cleanup();
    }
  });
});
