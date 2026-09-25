// @vitest-environment jsdom
import { fireEvent } from '@testing-library/dom';
import React, { act } from 'react';
import { inspectDvtSubstraitJoinDraft } from '@dvt/postgres-projection';
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import { DvtSubstraitCompositionStartSection } from './DvtSubstraitCompositionStartSection';
import { describe, expect, it, vi } from 'vitest';
import {
  input,
  inputOnConnection,
  useCompositionStartHarness,
} from './DvtSubstraitCompositionStartSection.test-support';
describe('Composition start inputs', () => {
  const view = useCompositionStartHarness();
  it('opens a valid PostgreSQL pair when an earlier N-input candidate is target-incompatible', async () => {
    await act(async () => {
      view.root.render(
        <DvtSubstraitCompositionStartSection
          disabled={false}
          inputs={[
            inputOnConnection('external', 'external', 'snowflake', 'external'),
            inputOnConnection('orders', 'orders', 'postgres', 'warehouse-main'),
            inputOnConnection('customers', 'customers', 'postgres', 'warehouse-main'),
          ]}
          onStartInnerJoin={vi.fn()}
        />
      );
    });

    await act(async () => {
      fireEvent.click(
        view.container.querySelector<HTMLButtonElement>(
          '[data-slot="dvt-select-operation-inner-join"]'
        )!
      );
    });

    const left = view.container.querySelector<HTMLSelectElement>(
      '[data-slot="dvt-composition-left-input"]'
    );
    const right = view.container.querySelector<HTMLSelectElement>(
      '[data-slot="dvt-composition-right-input"]'
    );
    expect(left?.value).toBe('orders');
    expect(right?.value).toBe('customers');
    expect(left?.textContent).not.toContain('external');
  });
  it('requires an explicit source pair when more than two JOIN inputs are compatible', async () => {
    const onStartInnerJoin = vi.fn();
    await act(async () => {
      view.root.render(
        <DvtSubstraitCompositionStartSection
          disabled={false}
          inputs={[
            input('orders', 'orders'),
            input('customers', 'customers'),
            input('shipments', 'shipments'),
          ]}
          onStartInnerJoin={onStartInnerJoin}
        />
      );
    });

    await act(async () => {
      fireEvent.click(
        view.container.querySelector<HTMLButtonElement>(
          '[data-slot="dvt-select-operation-inner-join"]'
        )!
      );
    });

    const left = view.container.querySelector<HTMLSelectElement>(
      '[data-slot="dvt-composition-left-input"]'
    )!;
    const right = view.container.querySelector<HTMLSelectElement>(
      '[data-slot="dvt-composition-right-input"]'
    )!;
    const apply = view.container.querySelector<HTMLButtonElement>(
      '[data-slot="dvt-start-configured-inner-join"]'
    )!;
    expect(left.value).toBe('');
    expect(right.value).toBe('');
    expect(right.disabled).toBe(true);
    expect(apply.disabled).toBe(true);
    expect(Array.from(left.options).map((option) => option.value)).toEqual([
      '',
      'orders',
      'customers',
      'shipments',
    ]);

    await await act(async () => fireEvent.change(left, { target: { value: 'customers' } }));
    expect(right.disabled).toBe(false);
    expect(right.value).toBe('');
    expect(Array.from(right.options).map((option) => option.value)).toEqual([
      '',
      'orders',
      'customers',
      'shipments',
    ]);
    await await act(async () => fireEvent.change(right, { target: { value: 'shipments' } }));

    expect(
      view.container.querySelector('[data-slot="semantic-workbench-join-condition-row"]')
        ?.textContent
    ).toContain('customers · 1.id = shipments · 2.id');
    expect(apply.disabled).toBe(false);

    await await act(async () => fireEvent.click(apply));
    expect(onStartInnerJoin).toHaveBeenCalledOnce();
    const inspection = inspectDvtSubstraitJoinDraft(
      onStartInnerJoin.mock.calls[0]?.[0] as SubstraitDocument
    );
    expect(inspection.ok).toBe(true);
    if (!inspection.ok) return;
    expect(inspection.projection.inputs.map((candidate) => candidate.table)).toEqual([
      'customers',
      'shipments',
    ]);
  });
});
