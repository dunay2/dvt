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
          onStartUnionAll={onStartUnionAll}
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
        view.container.querySelector<HTMLButtonElement>(
          '[data-slot="dvt-start-connected-union-all"]'
        )!
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
          onStartUnionDistinct={onStartUnionDistinct}
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
        view.container.querySelector<HTMLButtonElement>(
          '[data-slot="dvt-start-connected-union-all"]'
        )!
      );
    });
    expect(onStartUnionDistinct).toHaveBeenCalledOnce();
  });
  it.each([
    ['intersect-distinct', 'INTERSECT', 'onStartIntersectDistinct'],
    ['except-distinct', 'EXCEPT', 'onStartExceptDistinct'],
    ['intersect-all', 'INTERSECT ALL', 'onStartIntersectAll'],
    ['except-all', 'EXCEPT ALL', 'onStartExceptAll'],
  ] as const)('applies %s through its exact SetRel choice', async (slot, label, callbackName) => {
    const callback = vi.fn();
    await act(async () => {
      view.root.render(
        <DvtSubstraitCompositionStartSection
          disabled={false}
          inputs={[input('north', 'customers_north'), input('south', 'customers_south')]}
          onStartInnerJoin={vi.fn()}
          {...{ [callbackName]: callback }}
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
        view.container.querySelector<HTMLButtonElement>(
          '[data-slot="dvt-start-connected-union-all"]'
        )!
      );
    });
    expect(callback).toHaveBeenCalledOnce();
  });
});
