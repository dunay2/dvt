/** Owned concern: pending Output intent preserves physical Reads, publication and sibling identity. */
import { describe, expect, it } from 'vitest';
import type { CanvasDvtCompositionInput } from '../canvasDvtCompositionInputCatalog';
import {
  pendingSourceOutputInput as input,
  createPendingSourceOutputSession as session,
} from './pendingSourceOutputSelection.test.fixtures';

describe('pending Source initial Output command', () => {
  it('changes one local preference and preserves the Read, sibling and Input bindings', () => {
    const state = session();
    const saved = JSON.stringify(state.producer);
    const [first, second] = state.left.read.fields;
    expect(
      state.actions().setOutputIncluded(state.left.read.binding.relationId, first!.fieldId, false)
    ).toBe(true);
    expect(state.pending()[0]).toEqual({ ...state.left, initialOutputFieldIds: [second!.fieldId] });
    expect(state.pending()[1]).toBe(state.right);
    expect(state.pending()[0]!.read).toBe(state.left.read);
    expect(JSON.stringify(state.producer)).toBe(saved);
    expect(state.start).toHaveBeenCalledOnce();
    expect(
      state.actions().setOutputIncluded(state.left.read.binding.relationId, second!.fieldId, false)
    ).toBe(true);
    expect(state.pending()[0]).toHaveProperty('initialOutputFieldIds', []);
    expect(
      state.actions().setOutputIncluded(state.left.read.binding.relationId, first!.fieldId, true)
    ).toBe(true);
    expect(state.pending()[0]).toHaveProperty('initialOutputFieldIds', [first!.fieldId]);
  });

  it('applies each accepted delta from one action snapshot without losing batched exclusions', () => {
    const state = session();
    const actions = state.actions();
    const id = state.left.read.binding.relationId;
    const [first, second] = state.left.read.fields;
    expect(actions.setOutputIncluded(id, first!.fieldId, false)).toBe(true);
    expect(actions.setOutputIncluded(id, second!.fieldId, false)).toBe(true);
    expect(state.pending()[0]).toHaveProperty('initialOutputFieldIds', []);
    const unchanged = state.pending();
    expect(actions.setOutputIncluded(id, second!.fieldId, false)).toBe(true);
    expect(state.pending()).toBe(unchanged);
    expect(actions.setOutputIncluded(id, first!.fieldId, true)).toBe(true);
    expect(state.pending()[0]).toHaveProperty('initialOutputFieldIds', [first!.fieldId]);
    expect(state.pending()[1]).toBe(state.right);
  });

  it('initializes the default from the admitted producer publication', () => {
    const published: CanvasDvtCompositionInput = {
      ...input,
      inputBindings: {
        version: 'v1',
        fields: [{ inputId: 'mapped-parent', producerFieldId: 'parent_id' }],
      },
    };
    const state = session({ input: published });
    expect(
      state
        .actions()
        .setOutputIncluded(
          state.left.read.binding.relationId,
          state.left.read.fields[0]!.fieldId,
          true
        )
    ).toBe(false);
    expect(state.start).not.toHaveBeenCalled();
    expect(
      state
        .actions()
        .setOutputIncluded(
          state.left.read.binding.relationId,
          state.left.read.fields[1]!.fieldId,
          false
        )
    ).toBe(true);
    expect(state.pending()[0]).toHaveProperty('initialOutputFieldIds', []);
    expect(state.producer.inputBindings).toBe(published.inputBindings);
  });

  it('rejects nested-only fields and an unresolved publication before starting the draft', () => {
    const state = session({ nested: true });
    const child = state.left.read.fields.find((field) => field.parentFieldId != null)!;
    const previous = state.pending();
    expect(
      state.actions().setOutputIncluded(state.left.read.binding.relationId, child.fieldId, false)
    ).toBe(false);
    expect(state.pending()).toBe(previous);
    expect(state.start).not.toHaveBeenCalled();

    const unresolved = session({
      creationInput: input,
      input: {
        ...input,
        inputBindings: {
          version: 'v1',
          fields: [{ inputId: 'missing', producerFieldId: 'withdrawn' }],
        },
      },
    });
    expect(
      unresolved
        .actions()
        .setOutputIncluded(
          unresolved.left.read.binding.relationId,
          unresolved.left.read.fields[0]!.fieldId,
          false
        )
    ).toBe(false);
    expect(unresolved.start).not.toHaveBeenCalled();
  });

  it('preserves normalized defaults without changing state for an unchanged selection', () => {
    const state = session();
    const previous = state.pending();
    expect(
      state
        .actions()
        .setOutputIncluded(
          state.left.read.binding.relationId,
          state.left.read.fields[0]!.fieldId,
          true
        )
    ).toBe(true);
    expect(state.pending()).toBe(previous);
    expect(state.pending()[0]).toHaveProperty(
      'initialOutputFieldIds',
      state.left.read.fields.map((field) => field.fieldId)
    );
    expect(state.start).toHaveBeenCalledOnce();
  });

  it.each([
    'read-only',
    'start-denied',
    'foreign-relation',
    'foreign-field',
    'sibling-field',
  ] as const)('rejects %s without changing occurrence state', (fault) => {
    const state = session({
      editable: fault !== 'read-only',
      start: () => fault !== 'start-denied',
    });
    const previous = state.pending();
    const relationId =
      fault === 'foreign-relation' ? 'foreign' : state.left.read.binding.relationId;
    const fieldId =
      fault === 'foreign-field'
        ? 'foreign'
        : fault === 'sibling-field'
          ? state.right.read.fields[0]!.fieldId
          : state.left.read.fields[0]!.fieldId;
    expect(state.actions().setOutputIncluded(relationId, fieldId, false)).toBe(false);
    expect(state.pending()).toBe(previous);
    if (fault !== 'start-denied') expect(state.start).not.toHaveBeenCalled();
  });
});
