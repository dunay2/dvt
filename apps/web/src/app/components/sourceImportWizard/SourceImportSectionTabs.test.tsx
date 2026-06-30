// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SourceImportSectionTabs } from './SourceImportSectionTabs';

describe('SourceImportSectionTabs', () => {
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

  it('renders the required Add Source sections as presentation-owned tabs', async () => {
    const onSectionChange = vi.fn();

    await act(async () => {
      root.render(
        <SourceImportSectionTabs
          activeSection="connections"
          canEnterSection={(section) => section !== 'metadata'}
          onSectionChange={onSectionChange}
        />
      );
    });

    const tabs = sourceImportTabs();
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      'Connections',
      'Browse',
      'Metadata',
      'Selected',
    ]);
    expect(tabs[0]?.getAttribute('aria-selected')).toBe('true');
    expect(tabs[2]?.disabled).toBe(true);

    await act(async () => {
      fireEvent.click(tabs[1]!);
      fireEvent.click(tabs[2]!);
    });

    expect(onSectionChange).toHaveBeenCalledTimes(1);
    expect(onSectionChange).toHaveBeenCalledWith('browse');
  });

  function sourceImportTabs(): HTMLButtonElement[] {
    return Array.from(
      container.querySelectorAll<HTMLButtonElement>('[data-slot="source-import-section-tab"]')
    );
  }
});
