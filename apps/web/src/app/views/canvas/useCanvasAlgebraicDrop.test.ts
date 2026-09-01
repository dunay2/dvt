import type { Node } from '@xyflow/react';
import { describe, expect, it, vi } from 'vitest';

import { resolveCanvasAlgebraicDropHover } from './useCanvasAlgebraicDrop';

function node(id: string, x: number, operations: readonly ('inner_join' | 'union_all')[]): Node {
  return {
    id,
    position: { x, y: 0 },
    measured: { width: 100, height: 100 },
    data: {
      resolveAlgebraicCompositionOperations: vi.fn(() => [...operations]),
    },
  };
}

describe('Canvas algebraic drop', () => {
  it('selects the admitted operation represented by the occupied half of the target', () => {
    const target = node('transform', 100, ['inner_join', 'union_all']);

    expect(resolveCanvasAlgebraicDropHover(node('source', 80, []), [target])).toMatchObject({
      targetNodeId: target.id,
      activeOperation: 'inner_join',
    });
    expect(resolveCanvasAlgebraicDropHover(node('source', 130, []), [target])).toMatchObject({
      targetNodeId: target.id,
      activeOperation: 'union_all',
    });
  });

  it('does not invent a drop target when no canonical operation is admitted', () => {
    expect(
      resolveCanvasAlgebraicDropHover(node('source', 100, []), [node('transform', 100, [])])
    ).toBeNull();
  });
});
