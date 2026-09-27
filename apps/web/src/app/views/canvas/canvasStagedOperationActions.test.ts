import { describe, expect, it } from 'vitest';
import type { CanvasStagedOperation } from './canvasStagedOperation';
import { createCanvasStagedOperationActions } from './canvasStagedOperationActions';

function actionsFor(state: {
  operations: readonly CanvasStagedOperation[];
  consumedProducerIds?: readonly string[];
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
    consumedProducerIds: state.consumedProducerIds ?? [],
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

  it('requires separate instances for the two JOIN ports', () => {
    const state = {
      operations: [
        { id: 'join', operation: 'inner_join', inputs: [null, null] },
      ] satisfies readonly CanvasStagedOperation[],
    };
    const actions = actionsFor(state);

    actions.connect('join', 1, 'left');
    actions.connect('join', 0, 'left');

    expect(state.operations[0]?.inputs).toEqual([null, 'left']);
    actions.connect('join', 0, 'right');
    expect(state.operations[0]?.inputs).toEqual(['right', 'left']);
  });

  it('rejects fan-out across operations and frees an instance on disconnect', () => {
    const state = {
      operations: [
        { id: 'first', operation: 'filter', inputs: [null] },
        { id: 'second', operation: 'aggregate', inputs: [null] },
      ] satisfies readonly CanvasStagedOperation[],
    };
    const actions = actionsFor(state);
    actions.connect('first', 0, 'left');
    actions.connect('second', 0, 'left');
    expect(state.operations.map((operation) => operation.inputs)).toEqual([['left'], [null]]);
    actions.disconnect('first', 0);
    actions.connect('second', 0, 'left');
    expect(state.operations.map((operation) => operation.inputs)).toEqual([[null], ['left']]);
  });

  it('reserves instances consumed by the canonical tree or terminal Output', () => {
    const state = {
      operations: [
        { id: 'join', operation: 'inner_join', inputs: [null, null] },
      ] satisfies readonly CanvasStagedOperation[],
      consumedProducerIds: ['left'],
    };
    actionsFor(state).connect('join', 0, 'left');
    expect(state.operations[0]?.inputs).toEqual([null, null]);
    state.consumedProducerIds = [];
    actionsFor(state).connect('join', 0, 'left');
    expect(state.operations[0]?.inputs).toEqual(['left', null]);
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
