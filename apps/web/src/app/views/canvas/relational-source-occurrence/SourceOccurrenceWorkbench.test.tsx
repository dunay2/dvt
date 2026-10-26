// @vitest-environment jsdom
/** Owned concern: exercise explicit occurrence append through the real Workbench transaction. */
import React, { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { CanvasRelationalTreeWorkbench } from '../CanvasRelationalTreeWorkbench';
import {
  COPY,
  container,
  root,
  setupWorkbenchTest,
  dragSourceTo,
} from '../CanvasRelationalTreeWorkbench.test-support';
import { occurrenceGraph } from './occurrence.test.fixtures';
import { openOperationMenu } from '../operation-menu/operationMenu.test-support';
import { createSourceOccurrenceActions } from './sourceOccurrenceActions';
import {
  createPendingSourceOccurrence,
  type PendingSourceOccurrence,
} from './pendingSourceOccurrence';
import { occurrenceInput } from './occurrence.test.fixtures';
import type { CanvasDvtCompositionInput } from '../canvasDvtCompositionInputCatalog';

describe('pending Source initial Output command', () => {
  const input: CanvasDvtCompositionInput = {
    ...occurrenceInput.source,
    fields: occurrenceInput.fields.map((name) => ({
      name,
      dataType: 'bigint',
      joinDataType: 'i64',
    })),
  };
  function session(
    options: {
      editable?: boolean;
      start?: () => boolean;
      input?: CanvasDvtCompositionInput;
      creationInput?: CanvasDvtCompositionInput;
      nested?: boolean;
    } = {}
  ): {
    left: PendingSourceOccurrence;
    right: PendingSourceOccurrence;
    start: ReturnType<typeof vi.fn<() => boolean>>;
    actions: () => ReturnType<typeof createSourceOccurrenceActions>;
    pending: () => readonly PendingSourceOccurrence[];
    producer: CanvasDvtCompositionInput;
  } {
    const producer = options.input ?? input;
    const created = createPendingSourceOccurrence(options.creationInput ?? producer);
    const left = options.nested
      ? {
          ...created,
          read: {
            ...created.read,
            fields: [
              ...created.read.fields,
              {
                ...created.read.fields[0]!,
                fieldId: 'nested-detail',
                parentFieldId: created.read.fields[0]!.fieldId,
                outputOrdinal: 0,
              },
            ],
          },
        }
      : created;
    const right = createPendingSourceOccurrence(options.creationInput ?? producer);
    let pending: readonly PendingSourceOccurrence[] = [left, right];
    const start = vi.fn(options.start ?? (() => true));
    const actions = (): ReturnType<typeof createSourceOccurrenceActions> =>
      createSourceOccurrenceActions({
        editable: options.editable ?? true,
        session: null,
        revision: 0,
        inputs: [producer],
        start,
        pending,
        setPending: (update) => {
          pending = update(pending);
        },
        selectedId: null,
        setSelectedId: vi.fn(),
      });
    return { left, right, start, actions, pending: () => pending, producer };
  }

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

describe('explicit source occurrence controls', () => {
  setupWorkbenchTest();
  it('adds a third independent Read, connects it explicitly and cancels without writing', async () => {
    const graph = occurrenceGraph();
    const onApplyNodeDraft = vi.fn(() => ({ outcome: 'no_changes' as const }));
    await act(async () =>
      root.render(
        <CanvasRelationalTreeWorkbench
          transformNode={graph.targetNode}
          nodes={graph.nodes}
          edges={graph.edges}
          copy={COPY}
          authoring={{ canEditNode: true, onApplyNodeDraft }}
        />
      )
    );
    const add = container.querySelector<HTMLButtonElement>('[data-slot="source-occurrence-add"]');
    expect(add).not.toBeNull();
    expect(add!.disabled).toBe(false);
    await act(async () => add!.click());
    const pendingId = container
      .querySelector('[data-pending="true"]')!
      .getAttribute('data-relation-id');
    expect(
      container.querySelector('[data-slot="canvas-relational-tree-append-join-input"]')
    ).toBeNull();
    const inspector = container.querySelector('[data-canvas-inspector="true"]:not([hidden])');
    expect(inspector?.getAttribute('data-relation-id')).toBe(pendingId);
    await act(async () =>
      inspector!.querySelector<HTMLButtonElement>('[data-slot="canvas-relational-edit"]')!.click()
    );
    await act(async () =>
      inspector!
        .querySelector<HTMLButtonElement>('[data-slot="canvas-operation-properties-tab"]')!
        .click()
    );
    const alias = inspector?.querySelector<HTMLInputElement>(
      '[data-slot="source-occurrence-alias"]'
    );
    expect(alias?.value).toBe(
      container.querySelector('[data-pending="true"] [data-slot="canvas-relational-node-title"]')
        ?.textContent
    );
    expect(inspector?.querySelectorAll('[data-field-id]').length).toBeGreaterThan(0);
    expect(onApplyNodeDraft).not.toHaveBeenCalled();
    openOperationMenu(container);
    await act(async () =>
      document.querySelector<HTMLElement>('[data-slot="dvt-select-operation-aggregate"]')!.click()
    );
    const operation = container.querySelector<HTMLElement>('[data-pending-operation="true"]')!;
    const producer = Array.from(
      container.querySelectorAll<HTMLElement>('[data-slot="canvas-relational-output-port"]')
    ).find(
      (port) =>
        port.parentElement?.querySelector(
          `[data-pending="true"][data-relation-id="${pendingId}"]`
        ) != null
    )!;
    await act(async () =>
      dragSourceTo(
        producer,
        operation.querySelector<HTMLElement>('[data-slot="canvas-relational-input-port"]')!
      )
    );
    expect(container.querySelectorAll('[data-slot="canvas-relational-pending-edge"]')).toHaveLength(
      1
    );
    expect(container.querySelector('[data-pending="true"]')).not.toBeNull();
    expect(container.querySelectorAll('[data-slot="canvas-relational-tree-source"]')).toHaveLength(
      1
    );
    expect(graph.edges).toHaveLength(1);
    expect(
      container.querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-apply"]')
        ?.disabled
    ).toBe(false);
    expect(onApplyNodeDraft).not.toHaveBeenCalled();
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-cancel"]')!
        .click()
    );
    expect(container.querySelectorAll('[data-operator="read"]')).toHaveLength(2);
    expect(onApplyNodeDraft).not.toHaveBeenCalled();
  });

  it('selects and renames pending siblings without composing them or losing the draft', async () => {
    const graph = occurrenceGraph();
    const apply = vi.fn();
    await act(async () =>
      root.render(
        <CanvasRelationalTreeWorkbench
          transformNode={graph.targetNode}
          nodes={graph.nodes}
          edges={graph.edges}
          copy={COPY}
          authoring={{ canEditNode: true, onApplyNodeDraft: apply }}
        />
      )
    );
    const click = async (selector: string): Promise<void> => {
      await act(async () => container.querySelector<HTMLButtonElement>(selector)!.click());
    };
    await click('[data-slot="source-occurrence-add"]');
    await click('[data-slot="source-occurrence-add"]');
    const pending = Array.from(
      container.querySelectorAll<HTMLButtonElement>('[data-pending="true"]')
    );
    const ids = pending.map((node) => node.getAttribute('data-relation-id'));
    await act(async () => pending[0]!.click());
    expect(container.querySelectorAll('[role="treeitem"][aria-selected="true"]')).toHaveLength(1);
    const selectedFields = Array.from(
      container.querySelectorAll('[data-slot="source-occurrence-outputs"] [data-field-id]'),
      (node) => node.getAttribute('data-field-id')
    );
    await click(
      '[data-canvas-inspector="true"]:not([hidden]) [data-slot="canvas-relational-edit"]'
    );
    await click(
      '[data-canvas-inspector="true"]:not([hidden]) [data-slot="canvas-operation-properties-tab"]'
    );
    for (const [alias, valid] of [
      [graph.draft.sidecar.relations.find((entry) => entry.sourceRef != null)!.displayName!, false],
      [
        pending[1]!.querySelector('[data-slot="canvas-relational-node-title"]')!.textContent!,
        false,
      ],
      ['Independent places', true],
    ] as const) {
      const input = container.querySelector<HTMLInputElement>(
        '[data-slot="source-occurrence-alias"]'
      )!;
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(
          input,
          alias
        );
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      expect(
        container.querySelector<HTMLButtonElement>('[data-slot="source-occurrence-update"]')!
          .disabled
      ).toBe(!valid);
    }
    await click('[data-slot="source-occurrence-update"]');
    expect(
      container.querySelector(`[data-operator="read"][data-relation-id="${ids[0]}"]`)!.textContent
    ).toContain('Independent places');
    await act(async () => pending[1]!.click());
    expect(
      container
        .querySelector('[data-canvas-inspector="true"]:not([hidden])')
        ?.getAttribute('data-relation-id')
    ).toBe(ids[1]);
    await click('[data-operator="join"]');
    expect(container.querySelector('[data-slot="source-occurrence-alias"]')).toBeNull();
    await click(`[data-operator="read"][data-relation-id="${ids[0]}"]`);
    await click(
      '[data-canvas-inspector="true"]:not([hidden]) [data-slot="canvas-relational-edit"]'
    );
    await click(
      '[data-canvas-inspector="true"]:not([hidden]) [data-slot="canvas-operation-properties-tab"]'
    );
    expect(
      container.querySelector<HTMLInputElement>('[data-slot="source-occurrence-alias"]')!.value
    ).toBe('Independent places');
    expect(
      Array.from(
        container.querySelectorAll('[data-slot="source-occurrence-outputs"] [data-field-id]'),
        (node) => node.getAttribute('data-field-id')
      )
    ).toEqual(selectedFields);
    expect(container.querySelectorAll('[data-pending="true"]')).toHaveLength(2);
    expect(container.querySelector('[data-slot="canvas-relational-tree-append-input"]')).toBeNull();
    expect(apply).not.toHaveBeenCalled();
  });
});
