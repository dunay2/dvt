// @vitest-environment jsdom

import { fireEvent, waitFor } from '@testing-library/dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resolveCanvasViewCopy } from '../canvasCopyCatalog';
import { CanvasGraphSearchControl } from '../CanvasGraphSearchControl';

describe('CanvasGraphSearchControl', () => {
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

  it('renders localized search state, focuses the query, and emits intents only', async () => {
    const copy = resolveCanvasViewCopy('es-ES');
    const onQueryChange = vi.fn();
    const onPrevious = vi.fn();
    const onNext = vi.fn();
    const onClose = vi.fn();

    act(() => {
      root.render(
        <CanvasGraphSearchControl
          model={{
            open: true,
            focusRequestId: 0,
            query: 'orders',
            status: 'matched',
            matchCount: 3,
            activeMatchPosition: 2,
            activeNodeId: 'orders-b',
          }}
          copy={copy}
          onQueryChange={onQueryChange}
          onPrevious={onPrevious}
          onNext={onNext}
          onClose={onClose}
          onKeyDown={vi.fn()}
          onQueryKeyDown={vi.fn()}
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
          model={{
            open: true,
            focusRequestId: 0,
            query: 'missing',
            status: 'no-match',
            matchCount: 0,
            activeMatchPosition: null,
            activeNodeId: null,
          }}
          copy={copy}
          onQueryChange={vi.fn()}
          onPrevious={vi.fn()}
          onNext={vi.fn()}
          onClose={vi.fn()}
          onKeyDown={vi.fn()}
          onQueryKeyDown={vi.fn()}
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
});
