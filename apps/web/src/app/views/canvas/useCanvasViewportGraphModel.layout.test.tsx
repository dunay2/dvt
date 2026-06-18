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
});
