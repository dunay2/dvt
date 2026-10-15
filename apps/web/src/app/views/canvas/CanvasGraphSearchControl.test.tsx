// @vitest-environment jsdom

import { fireEvent, waitFor } from '@testing-library/dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi, type Mocked } from 'vitest';

import { resolveCanvasViewCopy } from './canvasCopyCatalog';
import { CanvasGraphSearchControl } from './CanvasGraphSearchControl';
import type {
  CanvasGraphSearchControlBinding,
  CanvasGraphSearchControlModel,
} from './canvasGraphSearchControl.binding';

describe('CanvasGraphSearchControl', () => {
  let container: HTMLDivElement;
  let root: Root;
  let resizeObserverDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    resizeObserverDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'ResizeObserver');
    Object.defineProperty(globalThis, 'ResizeObserver', {
      configurable: true,
      writable: true,
      value: class {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      },
    });
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
    if (resizeObserverDescriptor == null) {
      Reflect.deleteProperty(globalThis, 'ResizeObserver');
    } else {
      Object.defineProperty(globalThis, 'ResizeObserver', resizeObserverDescriptor);
    }
  });

  it('renders localized search state, focuses the query, and emits intents only', async () => {
    const copy = resolveCanvasViewCopy('es-ES');
    const onQueryChange = vi.fn();
    const onPrevious = vi.fn();
    const onNext = vi.fn();
    const onClose = vi.fn();

    act(() => {
      root.render(
        <CanvasGraphSearchControl
          binding={{
            model: {
              open: true,
              focusRequestId: 0,
              query: 'orders',
              status: 'matched',
              matchCount: 3,
              activeMatchPosition: 2,
              activeNodeId: 'orders-b',
            },
            setQuery: onQueryChange,
            showPrevious: onPrevious,
            showNext: onNext,
            close: onClose,
            onControlKeyDown: vi.fn(),
            onQueryKeyDown: vi.fn(),
          }}
          copy={copy}
        />
      );
    });

    const input = container.querySelector<HTMLInputElement>('input[type="search"]')!;
    await waitFor(() => expect(document.activeElement).toBe(input));
    expect(input.getAttribute('aria-label')).toBe('Buscar nodos del grafo');
    expect(input.value).toBe('orders');
    expect(container.textContent).toContain('2 / 3');

    act(() => {
      fireEvent.change(input, { target: { value: 'customers' } });
      button('Resultado anterior').click();
      button('Resultado siguiente').click();
      button('Cerrar búsqueda del grafo').click();
    });

    expect(onQueryChange).toHaveBeenCalledWith('customers');
    expect(onPrevious).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);

    function button(label: string): HTMLButtonElement {
      return container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
    }
  });

  it('announces no matches and disables result navigation', () => {
    const copy = resolveCanvasViewCopy('es-ES');

    act(() => {
      root.render(
        <CanvasGraphSearchControl
          binding={{
            model: {
              open: true,
              focusRequestId: 0,
              query: 'missing',
              status: 'no-match',
              matchCount: 0,
              activeMatchPosition: null,
              activeNodeId: null,
            },
            setQuery: vi.fn(),
            showPrevious: vi.fn(),
            showNext: vi.fn(),
            close: vi.fn(),
            onControlKeyDown: vi.fn(),
            onQueryKeyDown: vi.fn(),
          }}
          copy={copy}
        />
      );
    });

    expect(container.querySelector('output')?.textContent).toBe('Sin resultados');
    expect(button('Resultado anterior').disabled).toBe(true);
    expect(button('Resultado siguiente').disabled).toBe(true);

    function button(label: string): HTMLButtonElement {
      return container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
    }
  });

  it('delegates both keyboard handlers and preserves focus requests and restoration', () => {
    const binding = createBinding();
    const trigger = document.createElement('button');
    document.body.append(trigger);
    try {
      act(() => {
        trigger.focus();
        root.render(
          <CanvasGraphSearchControl binding={binding} copy={resolveCanvasViewCopy('en-US')} />
        );
      });
      const input = container.querySelector<HTMLInputElement>('input[type="search"]')!;
      expect(document.activeElement).toBe(input);
      for (const callback of Object.values(binding).filter(
        (value) => typeof value === 'function'
      )) {
        expect(callback).not.toHaveBeenCalled();
      }

      const closeButton = container.querySelector<HTMLButtonElement>(
        'button[aria-label="Close graph search"]'
      )!;
      act(() => {
        fireEvent.keyDown(input, { key: 'Enter' });
        fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
        fireEvent.keyDown(input, { key: 'Escape' });
        closeButton.focus();
        fireEvent.keyDown(closeButton, { key: 'f', ctrlKey: true });
        fireEvent.keyDown(closeButton, { key: 'f', metaKey: true });
      });
      expect(
        binding.onQueryKeyDown.mock.calls.map(([event]) => [event.key, event.shiftKey])
      ).toEqual([
        ['Enter', false],
        ['Enter', true],
        ['Escape', false],
      ]);
      expect(binding.onControlKeyDown.mock.calls.map(([event]) => event.key)).toEqual([
        'Enter',
        'Enter',
        'Escape',
        'f',
        'f',
      ]);
      expect(binding.close).not.toHaveBeenCalled();
      expect(binding.showPrevious).not.toHaveBeenCalled();
      expect(binding.showNext).not.toHaveBeenCalled();

      act(() => {
        root.render(
          <CanvasGraphSearchControl
            binding={{ ...binding, model: { ...binding.model, focusRequestId: 1 } }}
            copy={resolveCanvasViewCopy('en-US')}
          />
        );
      });
      expect(document.activeElement).toBe(input);
      act(() => {
        root.render(
          <CanvasGraphSearchControl
            binding={{ ...binding, model: { ...binding.model, open: false } }}
            copy={resolveCanvasViewCopy('en-US')}
          />
        );
      });
      expect(container.querySelector('[data-slot="canvas-graph-search-control"]')).toBeNull();
      expect(document.activeElement).toBe(trigger);
    } finally {
      trigger.remove();
    }
  });

  it('does not dispatch while closed or through disabled idle navigation', () => {
    const binding = createBinding({
      open: false,
      status: 'idle',
      matchCount: 0,
      activeMatchPosition: null,
      activeNodeId: null,
    });
    act(() =>
      root.render(
        <CanvasGraphSearchControl binding={binding} copy={resolveCanvasViewCopy('en-US')} />
      )
    );
    expect(container.querySelector('[data-slot="canvas-graph-search-control"]')).toBeNull();
    act(() =>
      root.render(
        <CanvasGraphSearchControl
          binding={{ ...binding, model: { ...binding.model, open: true } }}
          copy={resolveCanvasViewCopy('en-US')}
        />
      )
    );
    const previous = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Previous result"]'
    )!;
    const next = container.querySelector<HTMLButtonElement>('button[aria-label="Next result"]')!;
    expect(previous.disabled).toBe(true);
    expect(next.disabled).toBe(true);
    act(() => {
      previous.click();
      next.click();
    });
    for (const callback of Object.values(binding).filter((value) => typeof value === 'function')) {
      expect(callback).not.toHaveBeenCalled();
    }
  });

  it('uses only the current binding after replacement', () => {
    const previousBinding = createBinding();
    const binding = createBinding({
      query: 'customers',
      matchCount: 1,
      activeMatchPosition: 1,
      activeNodeId: 'customers',
    });
    act(() =>
      root.render(
        <CanvasGraphSearchControl binding={previousBinding} copy={resolveCanvasViewCopy('en-US')} />
      )
    );
    act(() =>
      root.render(
        <CanvasGraphSearchControl binding={binding} copy={resolveCanvasViewCopy('en-US')} />
      )
    );
    const input = container.querySelector<HTMLInputElement>('input[type="search"]')!;
    expect(input.value).toBe('customers');
    expect(container.querySelector('output')?.textContent).toBe('1 / 1');
    act(() => {
      fireEvent.change(input, { target: { value: 'new query' } });
      container.querySelector<HTMLButtonElement>('button[aria-label="Previous result"]')!.click();
      container.querySelector<HTMLButtonElement>('button[aria-label="Next result"]')!.click();
      container
        .querySelector<HTMLButtonElement>('button[aria-label="Close graph search"]')!
        .click();
      fireEvent.keyDown(input, { key: 'Enter' });
    });
    expect(binding.setQuery).toHaveBeenCalledExactlyOnceWith('new query');
    expect(binding.showPrevious).toHaveBeenCalledTimes(1);
    expect(binding.showNext).toHaveBeenCalledTimes(1);
    expect(binding.close).toHaveBeenCalledTimes(1);
    expect(binding.onQueryKeyDown).toHaveBeenCalledTimes(1);
    expect(binding.onControlKeyDown).toHaveBeenCalledTimes(1);
    for (const callback of Object.values(previousBinding).filter(
      (value) => typeof value === 'function'
    )) {
      expect(callback).not.toHaveBeenCalled();
    }
  });

  function createBinding(
    model: Partial<CanvasGraphSearchControlModel> = {}
  ): Mocked<CanvasGraphSearchControlBinding> {
    const resolvedModel: CanvasGraphSearchControlModel = {
      open: true,
      focusRequestId: 0,
      query: 'orders',
      status: 'matched',
      matchCount: 3,
      activeMatchPosition: 2,
      activeNodeId: 'orders-b',
      ...model,
    };
    return {
      model: resolvedModel,
      setQuery: vi.fn<CanvasGraphSearchControlBinding['setQuery']>(),
      showPrevious: vi.fn<CanvasGraphSearchControlBinding['showPrevious']>(),
      showNext: vi.fn<CanvasGraphSearchControlBinding['showNext']>(),
      close: vi.fn<CanvasGraphSearchControlBinding['close']>(),
      onControlKeyDown: vi.fn<CanvasGraphSearchControlBinding['onControlKeyDown']>(),
      onQueryKeyDown: vi.fn<CanvasGraphSearchControlBinding['onQueryKeyDown']>(),
    } satisfies CanvasGraphSearchControlBinding;
  }
});
