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
  const onStage = vi.fn();
  const scrollDescriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView');
  const items = [
    {
      id: 'left_join',
      group: 'combine',
      label: 'LEFT JOIN',
      reason: null,
      active: false,
      draggable: true,
    },
    {
      id: 'filter',
      group: 'transform',
      label: 'Filter',
      reason: 'Unavailable for this output',
      active: false,
      draggable: false,
    },
    {
      id: 'sort',
      group: 'order',
      label: 'Order by',
      reason: null,
      active: false,
      draggable: false,
    },
    {
      id: 'aggregate',
      group: 'transform',
      label: 'Aggregate',
      reason: 'Connect an Input after placing it',
      active: false,
      draggable: true,
    },
  ] as const;
  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
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
          onStage={onStage}
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
    onStage.mockClear();
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
    expect(onStage).not.toHaveBeenCalled();
  });
  it('shows unavailable reasons and refuses their selection', () => {
    open();
    const item = document.querySelector<HTMLElement>('[data-operation="filter"]')!;
    expect(item.getAttribute('aria-disabled')).toBe('true');
    expect(item.textContent).toContain('Unavailable for this output');
    act(() => item.click());
    expect(onStage).not.toHaveBeenCalled();
  });
  it('omits empty groups before relational operands are available', () => {
    act(() =>
      root.render(
        <CanvasOperationMenu
          items={items.slice(1)}
          copy={resolveCanvasOperationMenuCopy('en')}
          onStage={onStage}
        />
      )
    );
    open();
    const headings = Array.from(
      document.querySelectorAll('[cmdk-group-heading]'),
      (heading) => heading.textContent
    );
    expect(headings).toEqual(['Transform', 'Order and limit']);
    expect(onStage).not.toHaveBeenCalled();
  });
  it.each(['Enter', ' ', 'ArrowDown'])(
    'opens on %s without relying on a synthesized click',
    (key) => {
      act(() => {
        host
          .querySelector('button')!
          .dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
      });
      expect(document.querySelector('[role="listbox"]')).not.toBeNull();
      expect(onStage).not.toHaveBeenCalled();
    }
  );
  it('stages an admitted operation and dismisses the menu', () => {
    open();
    act(() => document.querySelector<HTMLElement>('[data-operation="left_join"]')!.click());
    expect(onStage).toHaveBeenCalledExactlyOnceWith('left_join');
    expect(document.querySelector('[role="listbox"]')).toBeNull();
  });
  it('stages an operation that needs an Input instead of pretending it is already configurable', () => {
    open();
    act(() => document.querySelector<HTMLElement>('[data-operation="aggregate"]')!.click());
    expect(onStage).toHaveBeenCalledExactlyOnceWith('aggregate');
    expect(document.querySelector('[role="listbox"]')).toBeNull();
  });
});
