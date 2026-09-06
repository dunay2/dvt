// @vitest-environment jsdom

import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';

const { createCanvasDirectionalEdgeCall } = vi.hoisted(() => ({
  createCanvasDirectionalEdgeCall: vi.fn(),
}));

vi.mock('./canvasNodeMapper', async () => {
  const actual = await vi.importActual<typeof import('./canvasNodeMapper')>('./canvasNodeMapper');
  return {
    ...actual,
    createCanvasDirectionalEdge: (
      ...args: Parameters<typeof actual.createCanvasDirectionalEdge>
    ) => {
      createCanvasDirectionalEdgeCall(...args);
      return actual.createCanvasDirectionalEdge(...args);
    },
  };
});

import {
  buildCanonicalNode,
  buildViewportGraphModelArgs,
  renderViewportGraphModel,
} from './useCanvasViewportGraphModel.test.support';

describe('useCanvasViewportGraphModel geometry invalidation', () => {
  it('does not reproject semantic edges when only a node position changes', async () => {
    const mounted = await renderViewportGraphModel(
      buildViewportGraphModelArgs({
        visibleNodeIds: ['source-node', 'transform-node'],
        visibleEdges: [{ sourceId: 'source-node', targetId: 'transform-node' }],
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
            },
          ],
        },
      })
    );

    try {
      const originalEdges = mounted.readState()?.edges;
      createCanvasDirectionalEdgeCall.mockClear();

      await act(async () => {
        mounted.readState()?.onNodesChange([
          {
            id: 'source-node',
            type: 'position',
            position: { x: 180, y: 40 },
            dragging: true,
          },
        ]);
      });

      expect(
        mounted.readState()?.nodes.find((node) => node.id === 'source-node')?.position
      ).toEqual({
        x: 180,
        y: 40,
      });
      expect(mounted.readState()?.edges).toBe(originalEdges);
      expect(createCanvasDirectionalEdgeCall).not.toHaveBeenCalled();
    } finally {
      await mounted.cleanup();
    }
  });
  it.each(['source-node', 'transform-node'])(
    'omits edges while %s is unresolved',
    async (missingId) => {
      const args = buildViewportGraphModelArgs({
        visibleNodeIds: ['source-node', 'transform-node'],
        visibleEdges: [{ sourceId: 'source-node', targetId: 'transform-node' }],
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
            },
          ],
        },
      });
      const unresolvedArgs = {
        ...args,
        canonicalNodesById: new Map(
          [...args.canonicalNodesById].filter(([id]) => id !== missingId)
        ),
      };
      const mounted = await renderViewportGraphModel(unresolvedArgs);
      try {
        expect(mounted.readState()?.nodes.map((node) => node.id)).not.toContain(missingId);
        expect(mounted.readState()?.edges).toEqual([]);
        await mounted.rerender(args);
        expect(mounted.readState()?.edges).toHaveLength(1);
        await mounted.rerender(unresolvedArgs);
        expect(mounted.readState()?.edges).toEqual([]);
      } finally {
        await mounted.cleanup();
      }
    }
  );
});
