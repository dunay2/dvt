import { describe, expect, it } from 'vitest';
import type { CanvasStagedOperation } from './canvasStagedOperation';
import { createCanvasStagedOperationActions } from './canvasStagedOperationActions';

function actionsFor(state: {
  operations: readonly CanvasStagedOperation[];
}): ReturnType<typeof createCanvasStagedOperationActions> {
  return createCanvasStagedOperationActions({
    editable: true,
    start: () => true,
    operations: state.operations,
    setOperations: (update) => {
      state.operations = update(state.operations);
    },
    selectedId: null,
    setSelectedId: () => undefined,
    producerIds: ['left', 'right', 'join', 'first', 'second'],
  });
}

describe('staged operation commands', () => {
  it('connects both JOIN ports atomically in either order', () => {
    const state = {
      operations: [
        { id: 'join', operation: 'inner_join', inputs: [null, null] },
      ] satisfies readonly CanvasStagedOperation[],
    };
    const actions = actionsFor(state);

    actions.connect('join', 1, 'right');
    actions.connect('join', 0, 'left');

    expect(state.operations[0]?.inputs).toEqual(['left', 'right']);
  });

  it('allows one producer on both free JOIN ports for an explicit self-join', () => {
    const state = {
      operations: [
        { id: 'join', operation: 'inner_join', inputs: [null, null] },
      ] satisfies readonly CanvasStagedOperation[],
    };
    const actions = actionsFor(state);

    actions.connect('join', 1, 'left');
    actions.connect('join', 0, 'left');

    expect(state.operations[0]?.inputs).toEqual(['left', 'left']);
  });

  it('preserves an occupied port and rejects a cycle', () => {
    const state = {
      operations: [
        { id: 'first', operation: 'filter', inputs: ['left'] },
        { id: 'second', operation: 'aggregate', inputs: ['first'] },
      ] satisfies readonly CanvasStagedOperation[],
    };
    const actions = actionsFor(state);

    actions.connect('first', 0, 'right');
    actions.connect('first', 0, 'second');

    expect(state.operations).toEqual([
      { id: 'first', operation: 'filter', inputs: ['left'] },
      { id: 'second', operation: 'aggregate', inputs: ['first'] },
    ]);
  });
});
