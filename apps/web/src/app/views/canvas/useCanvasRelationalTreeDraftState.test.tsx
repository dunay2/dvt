// @vitest-environment jsdom
/** Semantic draft resets must not own or erase presentation layout. */
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CANVAS_RELATIONAL_OUTPUT_POSITION_ID } from './canvasRelationalTreeGeometry';
import { useCanvasRelationalTreeDraftState } from './useCanvasRelationalTreeDraftState';
import { createPendingSourceOccurrence } from './relational-source-occurrence/pendingSourceOccurrence';
import { occurrenceInput } from './relational-source-occurrence/occurrence.test.fixtures';
import { createSourceDocument } from './canvasSourceDocument';

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

  it('commits a matching graph snapshot and rejects stale initialization without consuming intent', () => {
    const source = {
      ...createPendingSourceOccurrence({
        ...occurrenceInput.source,
        fields: occurrenceInput.fields.map((name) => ({
          name,
          dataType: 'bigint',
          joinDataType: 'i64',
        })),
      }),
      initialOutputFieldIds: [],
    };
    const document = createSourceDocument([source.read], source.read);
    act(() => {
      state.setPendingSources([source]);
      state.setOutputRelationId(source.read.binding.relationId);
    });
    const stale = state.graphSnapshot;
    act(() => state.setPendingSources((current) => [...current]));
    act(() => state.commitOutputInitialization(stale, document, [source.read.binding.relationId]));
    expect(state.pendingSources[0]?.initialOutputFieldIds).toEqual([]);
    expect(state.joinDraft).toBeNull();
    act(() =>
      state.commitOutputInitialization(state.graphSnapshot, document, [
        source.read.binding.relationId,
      ])
    );
    expect(state.joinDraft).toBe(document);
    expect(state.pendingSources[0]?.initialOutputFieldIds).toBeUndefined();
    expect(state.outputRelationId).toBe(source.read.binding.relationId);
  });
});
