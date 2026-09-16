import type { Edge } from '@xyflow/react';
import { describe, expect, it, vi } from 'vitest';

import {
  buildCanvasDependencyEdgeData,
  readCanvasDependencyEdgeData,
} from './canvasDependencyEdgeModel';
import { projectCanvasRelationalCompositionEdgeInteractions } from './canvasRelationalCompositionEdgeInteraction';

function compositionEdge(state: 'pending' | 'canonical' | 'incomplete' | 'unresolved'): Edge {
  return {
    id: `${state}-edge`,
    source: 'source',
    target: 'transform',
    data: buildCanvasDependencyEdgeData({
      sourceId: 'source',
      targetId: 'transform',
      composition: {
        groupId: 'relational-composition:transform',
        label: state === 'canonical' ? 'INNER JOIN' : 'RELATE / COMPOSE',
        memberCount: 2,
        role: 'trunk-owner',
        state,
        ...(state === 'canonical' ? { operation: 'inner_join' as const } : {}),
      },
    }),
  };
}

describe('Canvas relational composition edge interaction', () => {
  it('opens the same relational-tree tab for pending and canonical truth', () => {
    const openRelationalTree = vi.fn();

    const projected = projectCanvasRelationalCompositionEdgeInteractions({
      edges: [compositionEdge('pending'), compositionEdge('canonical')],
      relationalTreeTargetNodeIds: new Set(['transform']),
      onActivate: openRelationalTree,
    });

    readCanvasDependencyEdgeData(projected[0]?.data)?.composition?.onActivate?.();
    readCanvasDependencyEdgeData(projected[1]?.data)?.composition?.onActivate?.();
    expect(openRelationalTree).toHaveBeenNthCalledWith(1, 'transform');
    expect(openRelationalTree).toHaveBeenNthCalledWith(2, 'transform');
  });

  it.each(['incomplete', 'unresolved'] as const)(
    'leaves %s truth non-interactive instead of presenting a false chooser',
    (state) => {
      const openRelationalTree = vi.fn();
      const edge = compositionEdge(state);

      const [projected] = projectCanvasRelationalCompositionEdgeInteractions({
        edges: [edge],
        relationalTreeTargetNodeIds: new Set(['transform']),
        onActivate: openRelationalTree,
      });

      expect(projected).toBe(edge);
      expect(
        readCanvasDependencyEdgeData(projected?.data)?.composition?.onActivate
      ).toBeUndefined();
      expect(openRelationalTree).not.toHaveBeenCalled();
    }
  );
});
