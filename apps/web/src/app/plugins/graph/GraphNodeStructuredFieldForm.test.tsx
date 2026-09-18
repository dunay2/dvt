// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphNodeStructuredFieldForm } from './GraphNodeStructuredFieldForm';

describe('GraphNodeStructuredFieldForm', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    document
      .querySelectorAll('[data-slot="graph-node-structured-field-form"]')
      .forEach((element) => element.remove());
    container.remove();
  });

  it('keeps a rejected grouping proposal visible and focused with its reason', () => {
    const onApply = vi.fn().mockReturnValue({
      outcome: 'rejected',
      reason: 'invalid_reference',
    });
    const onApplied = vi.fn();
    act(() => {
      root.render(
        <GraphNodeStructuredFieldForm
          language="en"
          childNames={['customer', 'amount']}
          unavailableNames={[]}
          onApply={onApply}
          onApplied={onApplied}
          onCancel={vi.fn()}
        />
      );
    });
    const surface = document.querySelector<HTMLElement>(
      '[data-slot="graph-node-structured-field-form"]'
    )!;
    const form = surface.querySelector('form')!;
    const input = surface.querySelector<HTMLInputElement>(
      '[data-slot="graph-node-structured-field-name"]'
    )!;
    act(() => {
      fireEvent.change(input, { target: { value: 'identity' } });
      fireEvent.submit(form);
    });

    expect(onApply).toHaveBeenCalledWith('identity');
    expect(onApplied).not.toHaveBeenCalled();
    expect(input.value).toBe('identity');
    expect(document.activeElement).toBe(input);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(surface.querySelector('[role="alert"]')?.textContent).toContain(
      'selected fields are no longer available'
    );
  });
});
