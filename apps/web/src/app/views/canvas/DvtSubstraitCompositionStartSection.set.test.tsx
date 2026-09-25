// @vitest-environment jsdom
import { fireEvent } from '@testing-library/dom';
import React, { act } from 'react';
import { DvtSubstraitCompositionStartSection } from './DvtSubstraitCompositionStartSection';
import { describe, expect, it, vi } from 'vitest';
import {
  input,
  useCompositionStartHarness,
} from './DvtSubstraitCompositionStartSection.test-support';
describe('Composition start set', () => {
  const view = useCompositionStartHarness();
  it('applies UNION ALL without manufacturing a field predicate', async () => {
    const onStartInnerJoin = vi.fn();
    const onStartUnionAll = vi.fn();
    await act(async () => {
      view.root.render(
        <DvtSubstraitCompositionStartSection
          disabled={false}
          inputs={[input('north', 'customers_north'), input('south', 'customers_south')]}
          onStartInnerJoin={onStartInnerJoin}
          onStartWithoutPredicate={{ union_all: onStartUnionAll }}
        />
      );
    });

    const unionAllOperation = view.container.querySelector<HTMLButtonElement>(
      '[data-slot="dvt-select-operation-union-all"]'
    )!;
    expect(unionAllOperation.textContent).toContain('UNION ALL');

    await act(async () => {
      fireEvent.click(unionAllOperation);
    });
    expect(view.container.querySelector('[data-slot="dvt-composition-left-input"]')).toBeNull();
    expect(onStartUnionAll).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(
        view.container.querySelector<HTMLButtonElement>('[data-slot="dvt-confirm-composition"]')!
      );
    });
    expect(onStartUnionAll).toHaveBeenCalledOnce();
    expect(onStartInnerJoin).not.toHaveBeenCalled();
  });
  it('applies UNION DISTINCT through its exact SetRel choice', async () => {
    const onStartUnionDistinct = vi.fn();
    await act(async () => {
      view.root.render(
        <DvtSubstraitCompositionStartSection
          disabled={false}
          inputs={[input('north', 'customers_north'), input('south', 'customers_south')]}
          onStartInnerJoin={vi.fn()}
          onStartWithoutPredicate={{ union_distinct: onStartUnionDistinct }}
        />
      );
    });

    const operation = view.container.querySelector<HTMLButtonElement>(
      '[data-slot="dvt-select-operation-union-distinct"]'
    )!;
    expect(operation.textContent).toContain('UNION');
    expect(operation.textContent).not.toContain('ALL');

    await act(async () => {
      fireEvent.click(operation);
    });
    expect(view.container.textContent).toContain(
      'raw.customers_north UNION DISTINCT raw.customers_south'
    );
    expect(onStartUnionDistinct).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(
        view.container.querySelector<HTMLButtonElement>('[data-slot="dvt-confirm-composition"]')!
      );
    });
    expect(onStartUnionDistinct).toHaveBeenCalledOnce();
  });
  it.each([
    ['intersect-distinct', 'INTERSECT', 'intersect_distinct'],
    ['except-distinct', 'EXCEPT', 'except_distinct'],
    ['intersect-all', 'INTERSECT ALL', 'intersect_all'],
    ['except-all', 'EXCEPT ALL', 'except_all'],
  ] as const)('applies %s through its exact SetRel choice', async (slot, label, operationId) => {
    const callback = vi.fn();
    await act(async () => {
      view.root.render(
        <DvtSubstraitCompositionStartSection
          disabled={false}
          inputs={[input('north', 'customers_north'), input('south', 'customers_south')]}
          onStartInnerJoin={vi.fn()}
          onStartWithoutPredicate={{ [operationId]: callback }}
        />
      );
    });

    const operation = view.container.querySelector<HTMLButtonElement>(
      `[data-slot="dvt-select-operation-${slot}"]`
    )!;
    expect(operation.textContent).toContain(label);
    await act(async () => {
      fireEvent.click(operation);
    });
    expect(view.container.textContent).toContain(
      `raw.customers_north ${label} raw.customers_south`
    );
    expect(callback).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.click(
        view.container.querySelector<HTMLButtonElement>('[data-slot="dvt-confirm-composition"]')!
      );
    });
    expect(callback).toHaveBeenCalledOnce();
  });
});
