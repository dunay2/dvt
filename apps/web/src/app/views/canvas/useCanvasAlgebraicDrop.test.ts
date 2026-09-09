// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import type { Node } from '@xyflow/react';
import { describe, expect, it, vi } from 'vitest';

import { resolveCanvasAlgebraicDropHover, useCanvasAlgebraicDrop } from './useCanvasAlgebraicDrop';

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

  it('uses live drag geometry and emits the admitted command exactly once', () => {
    const source = node('source', 0, []);
    const composeNodes = vi.fn();
    const targetBase = node('transform', 200, ['union_all']);
    const target: Node = {
      ...targetBase,
      data: { ...targetBase.data, onComposeCanvasNodes: composeNodes },
    };
    const movedSource: Node = { ...source, position: { x: 180, y: 0 } };
    let latest: ReturnType<typeof useCanvasAlgebraicDrop> | null = null;
    const container = document.createElement('div');
    const root = createRoot(container);
    const actEnvironment = globalThis as typeof globalThis & {
      IS_REACT_ACT_ENVIRONMENT?: boolean;
    };
    const previousActEnvironment = actEnvironment.IS_REACT_ACT_ENVIRONMENT;
    actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;

    function HookHost(): null {
      latest = useCanvasAlgebraicDrop([source, target], true);
      return null;
    }

    act(() => {
      root.render(createElement(HookHost));
    });
    act(() => {
      latest?.handleNodeDrag(movedSource, [movedSource]);
    });
    act(() => {
      latest?.handleNodeDragStop(movedSource, [movedSource]);
      latest?.handleNodeDragStop(movedSource, [movedSource, target]);
    });

    expect(composeNodes).toHaveBeenCalledTimes(1);
    expect(composeNodes).toHaveBeenCalledWith({
      sourceNodeId: 'source',
      targetNodeId: 'transform',
      operation: 'union_all',
    });

    act(() => root.unmount());
    actEnvironment.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
  });
});
