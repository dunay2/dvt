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
  it('retains measurements across semantic edits and accepts subsequent resize measurements', async () => {
    const source = buildCanonicalNode('source-node', 'dvt:source', 'input');
    const model = buildCanonicalNode('transform-node', 'dvt:transform', 'transform');
    const args = buildViewportGraphModelArgs({
      visibleNodeIds: [source.id, model.id],
      visibleEdges: [{ sourceId: source.id, targetId: model.id }],
      draftSemanticGraph: { canonicalNodes: [source, model], canonicalEdges: [] },
    });
    const mounted = await renderViewportGraphModel(args);
    try {
      await act(async () => {
        mounted.readState()?.onNodesChange([
          { id: source.id, type: 'dimensions', dimensions: { width: 384, height: 180 } },
          { id: model.id, type: 'dimensions', dimensions: { width: 384, height: 320 } },
        ]);
      });
      const measuredNodes = mounted.readState()!.nodes;
      const added = buildCanonicalNode('new-source', 'dvt:source', 'input');
      await mounted.rerender({
        ...args,
        visibleNodeIds: [...args.visibleNodeIds, added.id],
        canonicalNodesById: new Map([
          [source.id, source],
          [model.id, { ...model, name: 'Updated model' }],
          [added.id, added],
        ]),
      });
      for (const previous of measuredNodes) {
        const current = mounted.readState()!.nodes.find((node) => node.id === previous.id)!;
        expect(current.measured).toEqual(previous.measured);
        expect(current.position).toEqual(previous.position);
      }
      expect(mounted.readState()!.nodes.find((node) => node.id === model.id)?.data.name).toBe(
        'Updated model'
      );
      expect(
        mounted.readState()!.nodes.find((node) => node.id === added.id)?.measured
      ).toBeUndefined();
      await act(async () => {
        mounted
          .readState()
          ?.onNodesChange([
            { id: model.id, type: 'dimensions', dimensions: { width: 384, height: 360 } },
          ]);
      });
      expect(mounted.readState()!.nodes.find((node) => node.id === model.id)?.measured).toEqual({
        width: 384,
        height: 360,
      });
    } finally {
      await mounted.cleanup();
    }
  });

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
