// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { OperationalDrawerTabStrip } from './OperationalDrawerTabStrip';

const visibleTabs = [
  { id: 'log' as const, label: 'Registro', count: null },
  { id: 'runs' as const, label: 'Ejecuciones', count: 1 },
];
const hiddenTabs = [{ id: 'data' as const, label: 'Datos', count: null }];

describe('OperationalDrawerTabStrip', () => {
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
    act(() => root.unmount());
    container.remove();
  });

  it('exposes sibling close controls without changing selection', async () => {
    const onCloseTab = vi.fn();
    const onSelectTab = vi.fn();
    await act(async () => {
      root.render(
        <OperationalDrawerTabStrip
          activeTab="log"
          ariaLabel="Operaciones del Canvas"
          closeTabLabel="Cerrar {tab}"
          hiddenTabs={hiddenTabs}
          onCloseTab={onCloseTab}
          onRestoreTab={vi.fn()}
          onSelectTab={onSelectTab}
          restoreTabsLabel="Mostrar ventanas"
          visibleTabs={visibleTabs}
        />
      );
    });

    const close = container.querySelector<HTMLButtonElement>('[data-tab-close="log"]');
    expect(close?.closest('[role="tab"]')).toBeNull();
    await act(async () => fireEvent.click(close!));
    expect(onCloseTab).toHaveBeenCalledWith('log');
    expect(onSelectTab).not.toHaveBeenCalled();
  });

  it('restores a hidden tab from the strip context menu', async () => {
    const onRestoreTab = vi.fn();
    await act(async () => {
      root.render(
        <OperationalDrawerTabStrip
          activeTab="log"
          ariaLabel="Operaciones del Canvas"
          closeTabLabel="Cerrar {tab}"
          hiddenTabs={hiddenTabs}
          onCloseTab={vi.fn()}
          onRestoreTab={onRestoreTab}
          onSelectTab={vi.fn()}
          restoreTabsLabel="Mostrar ventanas"
          visibleTabs={visibleTabs}
        />
      );
    });

    await act(async () => fireEvent.contextMenu(container.querySelector('[role="tablist"]')!));
    const restore = document.body.querySelector<HTMLElement>('[data-restore-tab="data"]');
    expect(restore).not.toBeNull();
    await act(async () => fireEvent.click(restore!));
    expect(onRestoreTab).toHaveBeenCalledWith('data');
  });
});
