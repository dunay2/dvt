// @vitest-environment jsdom
/** Semantic draft resets must not own or erase presentation layout. */
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CANVAS_RELATIONAL_OUTPUT_POSITION_ID } from './canvasRelationalTreeGeometry';
import { useCanvasRelationalTreeDraftState } from './useCanvasRelationalTreeDraftState';

describe('relational-tree draft layout ownership', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  let state!: ReturnType<typeof useCanvasRelationalTreeDraftState>;

  function Harness(): null {
    state = useCanvasRelationalTreeDraftState();
    return null;
  }

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root.render(<Harness />));
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it('preserves manual positions across reset, clear and persisted-draft hydration', () => {
    const outputPosition = { x: 720, y: 160 };
    act(() =>
      state.setPositions(new Map([[CANVAS_RELATIONAL_OUTPUT_POSITION_ID, outputPosition]]))
    );
    act(() => state.reset());
    expect(state.positions.get(CANVAS_RELATIONAL_OUTPUT_POSITION_ID)).toEqual(outputPosition);

    act(() =>
      state.restoreIncomplete({
        sources: [],
        operations: [],
        outputRelationId: null,
        positions: new Map([['pending-source', { x: 80, y: 120 }]]),
      })
    );
    expect(state.positions.get(CANVAS_RELATIONAL_OUTPUT_POSITION_ID)).toEqual(outputPosition);
    expect(state.positions.get('pending-source')).toEqual({ x: 80, y: 120 });

    act(() => state.clear());
    expect(state.positions.get(CANVAS_RELATIONAL_OUTPUT_POSITION_ID)).toEqual(outputPosition);
    expect(state.positions.get('pending-source')).toEqual({ x: 80, y: 120 });
  });
});
