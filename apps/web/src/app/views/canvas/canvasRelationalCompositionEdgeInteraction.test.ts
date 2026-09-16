import type { Edge, Node } from '@xyflow/react';
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
  it('opens the same Transform code workbench for pending and canonical truth', () => {
    const inspectTransform = vi.fn();
    const nodes: Node[] = [
      {
        id: 'transform',
        position: { x: 0, y: 0 },
        data: { onInspectNode: inspectTransform },
      },
    ];

    const projected = projectCanvasRelationalCompositionEdgeInteractions({
      edges: [compositionEdge('pending'), compositionEdge('canonical')],
      nodes,
      canonicalTargetNodeIds: new Set(['transform']),
    });

    readCanvasDependencyEdgeData(projected[0]?.data)?.composition?.onActivate?.();
    expect(inspectTransform).toHaveBeenCalledWith('transform', 'code');

    readCanvasDependencyEdgeData(projected[1]?.data)?.composition?.onActivate?.();
    expect(inspectTransform).toHaveBeenLastCalledWith('transform', 'code');
    expect(inspectTransform).toHaveBeenCalledTimes(2);
  });

  it.each(['incomplete', 'unresolved'] as const)(
    'leaves %s truth non-interactive instead of presenting a false chooser',
    (state) => {
      const inspectTransform = vi.fn();
      const edge = compositionEdge(state);

      const [projected] = projectCanvasRelationalCompositionEdgeInteractions({
        edges: [edge],
        nodes: [
          {
            id: 'transform',
            position: { x: 0, y: 0 },
            data: { onInspectNode: inspectTransform },
          },
        ],
        canonicalTargetNodeIds: new Set(['transform']),
      });

      expect(projected).toBe(edge);
      expect(
        readCanvasDependencyEdgeData(projected?.data)?.composition?.onActivate
      ).toBeUndefined();
      expect(inspectTransform).not.toHaveBeenCalled();
    }
  );
});
