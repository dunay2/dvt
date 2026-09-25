// @vitest-environment jsdom
import { fireEvent } from '@testing-library/dom';
import React, { act } from 'react';
import { DvtSubstraitCompositionStartSection } from './DvtSubstraitCompositionStartSection';
import { describe, expect, it, vi } from 'vitest';
import {
  input,
  useCompositionStartHarness,
} from './DvtSubstraitCompositionStartSection.test-support';
describe('Composition start choice', () => {
  const view = useCompositionStartHarness();
  it('separates operation choice from predicate authoring and explicit apply', async () => {
    const onStartInnerJoin = vi.fn();
    const onStartUnionAll = vi.fn();
    await act(async () => {
      view.root.render(
        <DvtSubstraitCompositionStartSection
          disabled={false}
          inputs={[input('orders', 'orders'), input('customers', 'customers')]}
          onStartInnerJoin={onStartInnerJoin}
          onStartWithoutPredicate={{ union_all: onStartUnionAll }}
        />
      );
    });

    expect(
      view.container.querySelector('[data-slot="dvt-relational-operation-chooser"]')
    ).not.toBeNull();
    expect(view.container.querySelector('[data-slot="dvt-composition-left-input"]')).toBeNull();
    expect(onStartInnerJoin).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(
        view.container.querySelector<HTMLButtonElement>(
          '[data-slot="dvt-select-operation-inner-join"]'
        )!
      );
    });

    expect(view.container.querySelector('[data-slot="dvt-composition-left-input"]')).not.toBeNull();
    expect(
      view.container.querySelector('[data-slot="dvt-composition-right-input"]')
    ).not.toBeNull();
    const joinEditor = view.container.querySelector('[data-slot="dvt-substrait-inner-join-start"]');
    expect(joinEditor).not.toBeNull();
    expect(joinEditor?.className).not.toContain('border-t');
    expect(
      view.container.querySelector('[data-slot="semantic-workbench-join-condition-list"]')
    ).not.toBeNull();
    expect(onStartInnerJoin).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(
        view.container.querySelector<HTMLButtonElement>(
          '[data-slot="dvt-cancel-relational-operation"]'
        )!
      );
    });
    expect(view.container.querySelector('[data-slot="dvt-composition-left-input"]')).toBeNull();
    expect(onStartInnerJoin).not.toHaveBeenCalled();
    expect(onStartUnionAll).not.toHaveBeenCalled();
  });
});
