// @vitest-environment jsdom
/** Owned concern: exercise operation discovery without granting mutation authority. */
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CanvasOperationMenu } from './CanvasOperationMenu';
import { resolveCanvasOperationMenuCopy } from './canvasOperationMenuCopy';

describe('Canvas operation menu', () => {
  let host: HTMLDivElement;
  let root: Root;
  const onSelect = vi.fn();
  const scrollDescriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView');
  const items = [
    {
      id: 'left_join',
      group: 'combine',
      label: 'LEFT JOIN',
      reason: null,
      selectable: true,
      active: false,
      draggable: true,
    },
    {
      id: 'filter',
      group: 'transform',
      label: 'Filter',
      reason: 'Unavailable for this output',
      selectable: false,
      active: false,
      draggable: false,
    },
    {
      id: 'sort',
      group: 'order',
      label: 'Order by',
      reason: null,
      selectable: true,
      active: false,
      draggable: false,
    },
  ] as const;
  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    );
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    });
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    act(() =>
      root.render(
        <CanvasOperationMenu
          items={items}
          copy={resolveCanvasOperationMenuCopy('en')}
          onSelect={onSelect}
        />
      )
    );
  });
  afterEach(() => {
    act(() => root.unmount());
    host.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    if (scrollDescriptor)
      Object.defineProperty(Element.prototype, 'scrollIntoView', scrollDescriptor);
    else Reflect.deleteProperty(Element.prototype, 'scrollIntoView');
    onSelect.mockClear();
  });
  function open(): void {
    act(() => host.querySelector<HTMLButtonElement>('button')!.click());
  }
  it('keeps only one trigger at rest and groups the same operations on demand', () => {
    expect(host.querySelectorAll('button')).toHaveLength(1);
    expect(document.querySelector('[role="listbox"]')).toBeNull();
    open();
    for (const label of ['Combine', 'Transform', 'Order and limit']) {
      expect(document.querySelector('[role="listbox"]')?.textContent).toContain(label);
    }
    expect(onSelect).not.toHaveBeenCalled();
  });
  it('shows unavailable reasons and refuses their selection', () => {
    open();
    const item = document.querySelector<HTMLElement>('[data-operation="filter"]')!;
    expect(item.getAttribute('aria-disabled')).toBe('true');
    expect(item.textContent).toContain('Unavailable for this output');
    act(() => item.click());
    expect(onSelect).not.toHaveBeenCalled();
  });
  it('dispatches one exact admitted selector and dismisses the menu', () => {
    open();
    act(() => document.querySelector<HTMLElement>('[data-operation="left_join"]')!.click());
    expect(onSelect).toHaveBeenCalledExactlyOnceWith('left_join');
    expect(document.querySelector('[role="listbox"]')).toBeNull();
  });
});
