// @vitest-environment jsdom
/** Prove occurrence Output uses the real Model emit without deleting Inputs. */
import { act, useState, type ReactElement } from 'react';
import { fireEvent } from '@testing-library/dom';
import { describe, expect, it, vi } from 'vitest';
import { CanvasSourceOccurrenceOutputSelection } from './CanvasSourceOccurrenceOutputSelection';
import { CanvasRelationAnalysisContext } from './CanvasRelationAnalysisContext';
import { useCanvasRelationAnalysisSession } from './useCanvasRelationAnalysisSession';
import { createSourceJoin } from './canvasSourceJoin';
import { source } from './canvasRelationalOperator.test-support';
import { setupWorkbenchTest, root, container } from './CanvasRelationalTreeWorkbench.test-support';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import { CanvasSourceOccurrenceOutputs } from './CanvasSourceOccurrenceOutputs';
import { readCanvasSourceOccurrenceOutputSelection } from './canvasSourceOccurrenceOutputSlots';
import { changeSelectedRelationOutputs } from './canvasSelectedRelationOutputs';
import { connectedNamesProjectionDraft } from './canvasProjectionCommand.test-support';
import { applySelectedRelationDerivedOutput } from './canvasSelectedRelationDerivedOutput';
import { createSourceSet } from './canvasSourceSet';
import { composeSourceRelation } from './canvasComposeSourceRelation';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';

describe('Source occurrence Model Output', () => {
  setupWorkbenchTest();
  it('shows only included fields without editing controls in the normal view', async () => {
    const change = vi.fn();
    await act(async () =>
      root.render(
        <CanvasSourceOccurrenceOutputs
          fields={[
            { id: 'included', name: 'Visible', included: true, available: true },
            { id: 'excluded', name: 'Excluded', included: false, available: true },
          ]}
          disabled={false}
          onChange={change}
        />
      )
    );
    expect(container.textContent).toContain('Visible');
    expect(container.textContent).not.toContain('Excluded');
    expect(container.querySelector('button')).toBeNull();
    expect(change).not.toHaveBeenCalled();
  });
  it('removes and restores an implicit JOIN field without changing its Read or condition', async () => {
    const input = source('client');
    const initial = createSourceJoin({
      left: { source: input, fields: ['customer_id', 'name'] },
      right: { source: source('orders'), fields: ['customer_id', 'name'] },
      leftFieldName: 'customer_id',
      rightFieldName: 'customer_id',
      targetNodeId: 'model',
    });
    const read = initial.sidecar.relations.find((entry) => entry.sourceRef != null)!;
    const onChange = vi.fn();
    function Host(): ReactElement {
      const [draft, setDraft] = useState(initial);
      const analysis = useCanvasRelationAnalysisSession(draft, 'model');
      return (
        <CanvasRelationAnalysisContext.Provider value={analysis}>
          <CanvasSourceOccurrenceOutputSelection
            relationId={read.relationId}
            publishedFieldNames={['customer_id', 'name']}
            onChange={(next: SubstraitDocument) => {
              onChange(next);
              setDraft(next);
            }}
          />
        </CanvasRelationAnalysisContext.Provider>
      );
    }
    await act(async () => root.render(<Host />));
    const toggle = container.querySelector<HTMLButtonElement>(
      '[data-slot="source-occurrence-remove-field"]'
    )!;
    expect(toggle.disabled).toBe(false);
    toggle.focus();
    await act(async () => fireEvent.click(toggle));
    expect(onChange).toHaveBeenCalledOnce();
    const changed: SubstraitDocument = onChange.mock.calls[0]![0];
    const originalRoot = initial.plan.relations[0]!.relType;
    const nextRoot = changed.plan.relations[0]!.relType;
    if (
      originalRoot.case !== 'root' ||
      nextRoot.case !== 'root' ||
      originalRoot.value.input?.relType.case !== 'join' ||
      nextRoot.value.input?.relType.case !== 'join'
    )
      throw new Error('Expected JOIN fixture.');
    expect(nextRoot.value.input.relType.value.left).toEqual(
      originalRoot.value.input.relType.value.left
    );
    expect(nextRoot.value.input.relType.value.right).toEqual(
      originalRoot.value.input.relType.value.right
    );
    expect(nextRoot.value.input.relType.value.expression).toEqual(
      originalRoot.value.input.relType.value.expression
    );
    const reopened = new CanvasRelationAnalysisSession('reopened');
    reopened.receive(changed);
    expect((await reopened.query(null)).fields).toHaveLength(3);
    expect(container.querySelectorAll('[data-slot="source-occurrence-output-field"]')).toHaveLength(
      2
    );
    expect(toggle.isConnected).toBe(true);
    expect(document.activeElement).toBe(toggle);
    expect(toggle.getAttribute('data-included')).toBe('false');
    await act(async () => fireEvent.click(toggle));
    reopened.receive(onChange.mock.calls[1]![0]);
    expect((await reopened.query(null)).fields).toHaveLength(4);
    reopened.dispose();
  });

  it('keeps excluded rows recoverable and filters only presentation, returning focus to the filter', async () => {
    useApplicationLanguageStore.setState({ language: 'en' });
    const change = vi.fn();
    function Host(): ReactElement {
      const [included, setIncluded] = useState(true);
      return (
        <CanvasSourceOccurrenceOutputs
          editing
          fields={[
            { id: 'country', name: 'country', available: true, included },
            { id: 'key', name: 'key', available: true, included: true },
          ]}
          disabled={false}
          onChange={(id, value) => {
            change(id, value);
            setIncluded(value);
          }}
        />
      );
    }
    await act(async () => root.render(<Host />));
    const filter = container.querySelector<HTMLButtonElement>('[role="checkbox"]')!;
    const toggle = (): HTMLButtonElement => container.querySelector('[data-field-name="country"]')!;
    expect(filter.getAttribute('aria-checked')).toBe('false');
    await act(async () => fireEvent.click(toggle()));
    expect(toggle().getAttribute('data-included')).toBe('false');
    await act(async () => fireEvent.click(filter));
    expect(container.textContent).not.toContain('country');
    await act(async () => fireEvent.click(filter));
    await act(async () => fireEvent.click(toggle()));
    await act(async () => fireEvent.click(filter));
    toggle().focus();
    await act(async () => fireEvent.click(toggle()));
    expect(document.activeElement).toBe(filter);
    expect(change).toHaveBeenCalledTimes(3);
    expect(filter.textContent).not.toContain('country');
  });

  it.each([false, true])(
    'retains readonly authority or rejected publication (reject: %s)',
    async (reject) => {
      const input = source('client');
      const initial = createSourceJoin({
        left: { source: input, fields: ['customer_id', 'name'] },
        right: { source: source('orders'), fields: ['customer_id', 'name'] },
        leftFieldName: 'customer_id',
        rightFieldName: 'customer_id',
        targetNodeId: 'model',
      });
      const read = initial.sidecar.relations.find((entry) => entry.sourceRef != null)!;
      const rejected = vi.fn(() => false);
      function Host(): ReactElement {
        const analysis = useCanvasRelationAnalysisSession(initial, 'model');
        return (
          <CanvasRelationAnalysisContext.Provider value={analysis}>
            <CanvasSourceOccurrenceOutputSelection
              relationId={read.relationId}
              publishedFieldNames={['customer_id', 'name']}
              onChange={reject ? rejected : undefined}
            />
          </CanvasRelationAnalysisContext.Provider>
        );
      }
      await act(async () => root.render(<Host />));
      const toggle = container.querySelector<HTMLButtonElement>('[data-field-name="name"]');
      if (!reject) {
        expect(toggle).toBeNull();
        expect(container.querySelector('[role="checkbox"]')).toBeNull();
        expect(rejected).not.toHaveBeenCalled();
        return;
      }
      expect(toggle?.disabled).toBe(false);
      await act(async () => fireEvent.click(toggle!));
      expect(toggle!.getAttribute('data-included')).toBe('true');
      expect(rejected).toHaveBeenCalledTimes(reject ? 1 : 0);
      expect(container.querySelector('[role="alert"]') != null).toBe(reject);
    }
  );

  it('isolates self-JOIN occurrences even when their producer and field names match', async () => {
    const input = source('client');
    const document = createSourceJoin({
      left: { source: input, fields: ['customer_id', 'name'] },
      right: { source: input, fields: ['customer_id', 'name'] },
      leftFieldName: 'customer_id',
      rightFieldName: 'customer_id',
      targetNodeId: 'model',
    });
    const reads = document.sidecar.relations.filter((entry) => entry.sourceRef != null);
    const session = new CanvasRelationAnalysisSession('self-join');
    session.receive(document);
    const left = await readCanvasSourceOccurrenceOutputSelection(session, reads[0]!.relationId, 0);
    const right = await readCanvasSourceOccurrenceOutputSelection(session, reads[1]!.relationId, 0);
    const excluded = left.fields.find((field) => field.name === 'name')!;
    expect(excluded.available).toBe(true);
    expect(right.fields.find((field) => field.name === 'name')!.slots).not.toEqual(excluded.slots);
    await changeSelectedRelationOutputs(session, {
      relationId: session.rootId,
      expectedRevision: 0,
      outputs: left.slots
        .filter((slot) => slot.output != null && !excluded.slots.includes(slot.slot))
        .map((slot) => ({ slot: slot.slot, alias: slot.name })),
    });
    const actual = await readCanvasSourceOccurrenceOutputSelection(
      session,
      reads[1]!.relationId,
      session.revision
    );
    expect(actual.fields.every((field) => field.included)).toBe(true);
    expect((await session.query(null)).fields).toHaveLength(3);
    session.dispose();
  });

  it('keeps an explicit selection definition independent of Source output inclusion', async () => {
    const prepared = new CanvasRelationAnalysisSession('selection-definition');
    prepared.receive(connectedNamesProjectionDraft());
    const initial = await applySelectedRelationDerivedOutput(prepared, {
      relationId: prepared.rootId,
      expectedRevision: prepared.revision,
      intent: 'edit',
      alias: 'direct_copy',
      formula: 'first_name',
    });
    prepared.dispose();
    const read = initial.sidecar.relations.find((entry) => entry.sourceRef != null)!;
    const changes = vi.fn();
    function Host(): ReactElement {
      const [draft, setDraft] = useState(initial);
      const analysis = useCanvasRelationAnalysisSession(draft, 'projection');
      return (
        <CanvasRelationAnalysisContext.Provider value={analysis}>
          <CanvasSourceOccurrenceOutputSelection
            relationId={read.relationId}
            publishedFieldNames={['first_name', 'last_name']}
            onChange={(next) => {
              changes(next);
              setDraft(next);
            }}
          />
        </CanvasRelationAnalysisContext.Provider>
      );
    }
    const session = new CanvasRelationAnalysisSession('projection-oracle');
    session.receive(initial);
    const width = (await session.query(null)).fields.length;
    const original = session.locate(session.rootId, session.revision).relation;
    await act(async () => root.render(<Host />));
    const toggle = container.querySelector<HTMLButtonElement>('[data-field-name="first_name"]')!;
    await act(async () => fireEvent.click(toggle));
    session.receive(changes.mock.calls[0]![0]);
    expect((await session.query(null)).fields).toHaveLength(width - 1);
    expect(
      (await session.query(null)).bindings.some((field) => field.displayName === 'direct_copy')
    ).toBe(true);
    await act(async () => fireEvent.click(toggle));
    session.receive(changes.mock.calls[1]![0]);
    expect((await session.query(null)).fields).toHaveLength(width);
    const restored = session.locate(session.rootId, session.revision).relation;
    if (original.relType.case !== 'project' || restored.relType.case !== 'project')
      throw new Error('Expected Project.');
    expect(restored.relType.value.expressions).toEqual(original.relType.value.expressions);
    session.dispose();
  });

  it('does not attribute a calculation or a shared SET output to a Source field', async () => {
    const session = new CanvasRelationAnalysisSession('calculation');
    const initial = connectedNamesProjectionDraft();
    session.receive(initial);
    const read = initial.sidecar.relations.find((entry) => entry.sourceRef != null)!;
    await applySelectedRelationDerivedOutput(session, {
      relationId: session.rootId,
      expectedRevision: 0,
      intent: 'edit',
      alias: 'calculated',
      formula: 'UPPER(first_name)',
    });
    const before = session.locate(session.rootId, session.revision).relation;
    const selection = await readCanvasSourceOccurrenceOutputSelection(
      session,
      read.relationId,
      session.revision
    );
    const field = selection.fields.find((entry) => entry.name === 'first_name')!;
    expect(field.available).toBe(true);
    const document = await changeSelectedRelationOutputs(session, {
      relationId: session.rootId,
      expectedRevision: session.revision,
      outputs: selection.slots
        .filter((slot) => slot.output != null && !field.slots.includes(slot.slot))
        .map((slot) => ({ slot: slot.slot, alias: slot.name })),
    });
    const after = session.locate(session.rootId, session.revision).relation;
    if (before.relType.case !== 'project' || after.relType.case !== 'project')
      throw new Error('Expected Project.');
    expect(after.relType.value.expressions).toEqual(before.relType.value.expressions);
    expect(document.sidecar.fields.some((entry) => entry.displayName === 'calculated')).toBe(true);
    session.dispose();
    const shared = createSourceSet({
      inputs: [source('left'), source('right')],
      targetNodeId: 'model',
    });
    session.receive(shared);
    const sharedRead = shared.sidecar.relations.find((entry) => entry.sourceRef != null)!;
    const sharedSelection = await readCanvasSourceOccurrenceOutputSelection(
      session,
      sharedRead.relationId,
      session.revision
    );
    expect(sharedSelection.fields.every((entry) => !entry.available)).toBe(true);
    session.dispose();
  });

  it('selects one field independently across twenty JOIN inputs with twenty fields each', async () => {
    const names = Array.from({ length: 20 }, (_, index) => `field_${index}`);
    const physical = (index: number): ReturnType<typeof source> => ({
      ...source(`table_${index}`),
      fields: names.map((name) => ({ name, type: 'string' })),
    });
    const initial = createSourceJoin({
      left: { source: physical(0), fields: names },
      right: { source: physical(1), fields: names },
      leftFieldName: names[0]!,
      rightFieldName: names[0]!,
      targetNodeId: 'model',
    });
    const session = new CanvasRelationAnalysisSession('large-join');
    session.receive(initial);
    for (let index = 2; index < 20; index++) {
      const input = physical(index);
      const current = await session.query(null);
      await composeSourceRelation(session, {
        relationId: session.rootId,
        expectedRevision: session.revision,
        operation: 'inner_join',
        predicate: { leftSourceFieldId: current.bindings[0]!.fieldId, rightFieldName: names[0]! },
        input: {
          ...input,
          fields: names.map((name) => ({ name, dataType: 'text', joinDataType: 'string' })),
        },
      });
    }
    expect((await session.query(null)).fields).toHaveLength(400);
    const read = initial.sidecar.relations.find((entry) => entry.sourceRef != null)!;
    const originalRead = session.locate(read.relationId, session.revision).relation;
    const selection = await readCanvasSourceOccurrenceOutputSelection(
      session,
      read.relationId,
      session.revision
    );
    expect(selection.fields).toHaveLength(20);
    expect(selection.fields.every((field) => field.available && field.included)).toBe(true);
    const excluded = selection.fields[19]!;
    await changeSelectedRelationOutputs(session, {
      relationId: session.rootId,
      expectedRevision: session.revision,
      outputs: selection.slots
        .filter((slot) => slot.output != null && !excluded.slots.includes(slot.slot))
        .map((slot) => ({ slot: slot.slot, alias: slot.name })),
    });
    expect((await session.query(null)).fields).toHaveLength(399);
    expect(session.locate(read.relationId, session.revision).relation).toEqual(originalRead);
    session.dispose();
  }, 20_000);
});
