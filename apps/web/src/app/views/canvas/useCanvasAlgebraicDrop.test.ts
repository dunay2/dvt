// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import type { Node } from '@xyflow/react';
import { describe, expect, it, vi } from 'vitest';

import { resolveCanvasAlgebraicDropHover, useCanvasAlgebraicDrop } from './useCanvasAlgebraicDrop';
import {
  CANVAS_ALGEBRAIC_DROP_GAP,
  CANVAS_ALGEBRAIC_DROP_INSET,
  CANVAS_ALGEBRAIC_DROP_PADDING,
  resolveCanvasAlgebraicDropGrid,
  resolveCanvasAlgebraicDropIndex,
} from './canvasAlgebraicDropGeometry';

function node(
  id: string,
  x: number,
  operations: readonly (
    | 'inner_join'
    | 'left_join'
    | 'left_semi_join'
    | 'left_anti_join'
    | 'right_semi_join'
    | 'right_anti_join'
    | 'union_all'
  )[]
): Node {
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

  it('maps every admitted JOIN-family landing cell instead of blocking after two choices', () => {
    const operations = [
      'inner_join',
      'left_join',
      'left_semi_join',
      'left_anti_join',
      'right_semi_join',
      'right_anti_join',
    ] as const;
    const target = node('transform', 100, operations);
    const dragged = {
      ...node('source', 130, []),
      position: { x: 130, y: 33 },
    };

    expect(resolveCanvasAlgebraicDropHover(dragged, [target])).toMatchObject({
      targetNodeId: target.id,
      activeOperation: 'right_anti_join',
    });
  });

  it('hit-tests every rendered cell from the same compact grid geometry', () => {
    const operationCount = 10;
    const width = 240;
    const height = 180;
    const { columns, rows } = resolveCanvasAlgebraicDropGrid(operationCount);
    const offset = CANVAS_ALGEBRAIC_DROP_INSET + CANVAS_ALGEBRAIC_DROP_PADDING;
    const cellWidth = (width - offset * 2 - CANVAS_ALGEBRAIC_DROP_GAP * (columns - 1)) / columns;
    const cellHeight = (height - offset * 2 - CANVAS_ALGEBRAIC_DROP_GAP * (rows - 1)) / rows;

    expect(
      Array.from({ length: operationCount }, (_, index) => {
        const column = index % columns;
        const row = Math.floor(index / columns);
        return resolveCanvasAlgebraicDropIndex({
          operationCount,
          width,
          height,
          x: offset + column * (cellWidth + CANVAS_ALGEBRAIC_DROP_GAP) + cellWidth / 2,
          y: offset + row * (cellHeight + CANVAS_ALGEBRAIC_DROP_GAP) + cellHeight / 2,
        });
      })
    ).toEqual(Array.from({ length: operationCount }, (_, index) => index));
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
