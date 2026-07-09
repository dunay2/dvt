// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GroupingStep } from './GroupingStep';

describe('GroupingStep', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('offers only source grouping strategies backed by the import rail', async () => {
    const onGroupingChange = vi.fn();

    await act(async () => {
      root.render(<GroupingStep groupingStrategy="schema" onGroupingChange={onGroupingChange} />);
    });

    expect(container.textContent).toContain('Group by Schema');
    expect(container.textContent).toContain('Group by Database');
    expect(container.textContent).not.toContain('Custom Grouping');

    const groupingOptions = Array.from(
      container.querySelectorAll<HTMLElement>('[data-source-import-grouping-option]')
    );
    expect(groupingOptions.map((option) => option.dataset.sourceImportGroupingOption)).toEqual([
      'schema',
      'database',
    ]);

    await act(async () => {
      fireEvent.click(container.querySelector<HTMLLabelElement>('label[for="database"]')!);
    });

    expect(onGroupingChange).toHaveBeenCalledWith('database');
  });
});
