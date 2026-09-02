// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import React, { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resolveCanvasViewCopy } from '../canvasCopyCatalog';
import { CanvasGraphFilterControl } from '../CanvasGraphFilterControl';

describe('CanvasGraphFilterControl', () => {
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

  it('renders an icon-only localized trigger and emits filter intents', () => {
    const onOpenChange = vi.fn();
    const onSelectDimension = vi.fn();
    const onSelectValue = vi.fn();
    const onAddPredicate = vi.fn();

    act(() => {
      root.render(
        <CanvasGraphFilterControl
          model={{
            open: true,
            predicates: [],
            composition: 'and',
            presentation: 'dim',
            status: 'idle',
            matchCount: 2,
            totalCount: 2,
            draftDimension: 'status',
            draftValue: 'failed',
            optionGroups: [{ dimension: 'status', values: ['failed', 'success'] }],
          }}
          copy={resolveCanvasViewCopy('es-ES')}
          onOpenChange={onOpenChange}
          onSelectDimension={onSelectDimension}
          onSelectValue={onSelectValue}
          onAddPredicate={onAddPredicate}
          onRemovePredicate={vi.fn()}
          onSetComposition={vi.fn()}
          onSetPresentation={vi.fn()}
          onClear={vi.fn()}
        />
      );
    });

    expect(document.querySelector('button[aria-label="Filtrar grafo"]')?.textContent).toBe('');
    expect(document.body.textContent).toContain('2 de 2 nodos visibles');
    const selects = document.querySelectorAll<HTMLSelectElement>(
      '[data-slot="canvas-graph-filter-control"] select'
    );
    act(() => {
      fireEvent.change(selects[0]!, { target: { value: 'status' } });
      fireEvent.change(selects[1]!, { target: { value: 'success' } });
      fireEvent.click(document.querySelector('button[aria-label="Añadir filtro"]')!);
    });
    expect(onSelectDimension).toHaveBeenCalledWith('status');
    expect(onSelectValue).toHaveBeenCalledWith('success');
    expect(onAddPredicate).toHaveBeenCalledTimes(1);
  });

  it('opens and closes from the same trigger', () => {
    function Harness(): JSX.Element {
      const [open, setOpen] = useState(false);
      return (
        <CanvasGraphFilterControl
          model={{
            open,
            predicates: [],
            composition: 'and',
            presentation: 'dim',
            status: 'idle',
            matchCount: 2,
            totalCount: 2,
            draftDimension: 'status',
            draftValue: 'failed',
            optionGroups: [{ dimension: 'status', values: ['failed', 'success'] }],
          }}
          copy={resolveCanvasViewCopy('es-ES')}
          onOpenChange={setOpen}
          onSelectDimension={vi.fn()}
          onSelectValue={vi.fn()}
          onAddPredicate={vi.fn()}
          onRemovePredicate={vi.fn()}
          onSetComposition={vi.fn()}
          onSetPresentation={vi.fn()}
          onClear={vi.fn()}
        />
      );
    }

    act(() => root.render(<Harness />));
    const trigger = document.querySelector<HTMLButtonElement>(
      'button[aria-label="Filtrar grafo"]'
    )!;

    act(() => {
      fireEvent.click(trigger);
    });
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(document.body.textContent).toContain('Filtros del grafo');

    act(() => {
      fireEvent.click(trigger);
    });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.querySelector('[data-slot="canvas-graph-filter-control"]')).toBeNull();
  });
});
