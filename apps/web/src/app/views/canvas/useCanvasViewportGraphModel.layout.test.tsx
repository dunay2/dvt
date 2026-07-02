// @vitest-environment jsdom

import { act } from 'react';
import { describe, expect, it } from 'vitest';

import {
  buildCanonicalNode,
  buildViewportGraphModelArgs,
  renderViewportGraphModel,
} from './useCanvasViewportGraphModel.test.support';

describe('useCanvasViewportGraphModel layout', () => {
  it('keeps live node positions ahead of persisted layout during viewport rerenders', async () => {
    const persistedNodePositions = {
      'source-node': { x: 40, y: 140 },
    };
    const args = buildViewportGraphModelArgs({
      visibleNodeIds: ['source-node'],
      visibleEdges: [],
      draftSemanticGraph: {
        canonicalNodes: [buildCanonicalNode('source-node', 'dvt:source', 'input')],
        canonicalEdges: [],
      },
      persistedNodePositions,
    });
    const mounted = await renderViewportGraphModel(args);

    try {
      expect(mounted.readState()?.nodes[0]?.position).toEqual({ x: 40, y: 140 });

      await act(async () => {
        mounted
          .readState()
          ?.setNodes((nodes) =>
            nodes.map((node) =>
              node.id === 'source-node'
                ? { ...node, dragging: false, position: { x: 225, y: 210 } }
                : node
            )
          );
        await Promise.resolve();
      });
      await mounted.rerender({
        ...args,
        persistedNodePositions: { ...persistedNodePositions },
      });

      expect(mounted.readState()?.nodes[0]?.position).toEqual({ x: 225, y: 210 });
    } finally {
      await mounted.cleanup();
    }
  });

  it('marks frozen viewport nodes as non-draggable without changing their position', async () => {
    const args = {
      ...buildViewportGraphModelArgs({
        visibleNodeIds: ['source-node'],
        visibleEdges: [],
        draftSemanticGraph: {
          canonicalNodes: [buildCanonicalNode('source-node', 'dvt:source', 'input')],
          canonicalEdges: [],
        },
        persistedNodePositions: {
          'source-node': { x: 40, y: 140 },
        },
      }),
      frozenNodeIds: new Set(['source-node']),
    } satisfies Parameters<typeof renderViewportGraphModel>[0] & {
      frozenNodeIds: ReadonlySet<string>;
    };
    const mounted = await renderViewportGraphModel(args);

    try {
      expect(mounted.readState()?.nodes[0]).toMatchObject({
        id: 'source-node',
        position: { x: 40, y: 140 },
        draggable: false,
      });
    } finally {
      await mounted.cleanup();
    }
  });

  it('reconciles draggable state when a mounted node is frozen or unfrozen', async () => {
    const baseArgs = buildViewportGraphModelArgs({
      visibleNodeIds: ['source-node'],
      visibleEdges: [],
      draftSemanticGraph: {
        canonicalNodes: [buildCanonicalNode('source-node', 'dvt:source', 'input')],
        canonicalEdges: [],
      },
      persistedNodePositions: {
        'source-node': { x: 40, y: 140 },
      },
    });
    const mounted = await renderViewportGraphModel(baseArgs);

    try {
      expect(mounted.readState()?.nodes[0]).toMatchObject({
        id: 'source-node',
        draggable: true,
      });

      await mounted.rerender({
        ...baseArgs,
        frozenNodeIds: new Set(['source-node']),
      });

      expect(mounted.readState()?.nodes[0]).toMatchObject({
        id: 'source-node',
        draggable: false,
      });

      await mounted.rerender({
        ...baseArgs,
        frozenNodeIds: new Set(),
      });

      expect(mounted.readState()?.nodes[0]).toMatchObject({
        id: 'source-node',
        draggable: true,
      });
    } finally {
      await mounted.cleanup();
    }
  });
});
