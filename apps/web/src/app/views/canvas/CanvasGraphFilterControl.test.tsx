// @vitest-environment jsdom
/** Owned concern: verify Filter UI binding intents and controlled Popover behavior. */

import { fireEvent, getByRole } from '@testing-library/dom';
import React, { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resolveCanvasViewCopy } from './canvasCopyCatalog';
import { CanvasGraphFilterControl } from './CanvasGraphFilterControl';
import type {
  CanvasGraphFilterControlBinding,
  CanvasGraphFilterControlModel,
} from './canvasGraphFilterControl.binding';

describe('CanvasGraphFilterControl', () => {
  let container: HTMLDivElement;
  let root: Root;
  const createBinding = (
    model: Partial<CanvasGraphFilterControlModel> = {}
  ): CanvasGraphFilterControlBinding => ({
    model: {
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
      ...model,
    },
    setOpen: vi.fn(),
    selectDimension: vi.fn(),
    selectValue: vi.fn(),
    addDraftPredicate: vi.fn(),
    removePredicate: vi.fn(),
    setComposition: vi.fn(),
    setPresentation: vi.fn(),
    clear: vi.fn(),
  });

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
    const binding = {
      ...createBinding(),
      setOpen: onOpenChange,
      selectDimension: onSelectDimension,
      selectValue: onSelectValue,
      addDraftPredicate: onAddPredicate,
    };

    act(() => {
      root.render(
        <CanvasGraphFilterControl binding={binding} copy={resolveCanvasViewCopy('es-ES')} />
      );
    });
    for (const [name, method] of Object.entries(binding)) {
      if (name !== 'model') expect(method).not.toHaveBeenCalled();
    }

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
    const onOpenChange = vi.fn();
    function Harness(): JSX.Element {
      const [open, setOpen] = useState(false);
      return (
        <CanvasGraphFilterControl
          binding={{
            ...createBinding({ open }),
            setOpen: (next) => {
              onOpenChange(next);
              setOpen(next);
            },
          }}
          copy={resolveCanvasViewCopy('es-ES')}
        />
      );
    }

    act(() => root.render(<Harness />));
    expect(onOpenChange).not.toHaveBeenCalled();
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
    expect(onOpenChange).toHaveBeenNthCalledWith(1, true);
    expect(onOpenChange).toHaveBeenNthCalledWith(2, false);
    expect(onOpenChange).toHaveBeenCalledTimes(2);
  });

  it('forwards composition, presentation, removal and clear without executing while rendering', () => {
    const copy = resolveCanvasViewCopy('en');
    const predicate = { dimension: 'status', value: 'failed' } as const;
    const binding = createBinding({ predicates: [predicate] });
    act(() => root.render(<CanvasGraphFilterControl binding={binding} copy={copy} />));
    for (const [name, method] of Object.entries(binding)) {
      if (name !== 'model') expect(method).not.toHaveBeenCalled();
    }
    expect(
      getByRole(document.body, 'button', { name: copy.canvasGraphFilterAndLabel }).getAttribute(
        'aria-pressed'
      )
    ).toBe('true');
    expect(
      getByRole(document.body, 'button', { name: copy.canvasGraphFilterDimLabel }).getAttribute(
        'aria-pressed'
      )
    ).toBe('true');
    const removeLabel = copy.canvasGraphFilterRemoveLabelTemplate
      .replace('{dimension}', copy.canvasGraphFilterStatusDimensionLabel)
      .replace('{value}', predicate.value);
    act(() => {
      fireEvent.click(getByRole(document.body, 'button', { name: copy.canvasGraphFilterOrLabel }));
      fireEvent.click(
        getByRole(document.body, 'button', { name: copy.canvasGraphFilterHideLabel })
      );
      fireEvent.click(getByRole(document.body, 'button', { name: removeLabel }));
      fireEvent.click(
        getByRole(document.body, 'button', { name: copy.canvasGraphFilterClearLabel })
      );
    });
    expect(binding.setComposition).toHaveBeenCalledExactlyOnceWith('or');
    expect(binding.setPresentation).toHaveBeenCalledExactlyOnceWith('hide');
    expect(binding.removePredicate).toHaveBeenCalledExactlyOnceWith(predicate);
    expect(binding.clear).toHaveBeenCalledOnce();
    for (const method of [
      binding.setOpen,
      binding.selectDimension,
      binding.selectValue,
      binding.addDraftPredicate,
    ])
      expect(method).not.toHaveBeenCalled();
  });

  it('keeps Add and Clear inert for an empty draft and no predicates', () => {
    const copy = resolveCanvasViewCopy('en');
    const binding = createBinding({ draftValue: '' });
    act(() => root.render(<CanvasGraphFilterControl binding={binding} copy={copy} />));
    const add = getByRole(document.body, 'button', {
      name: copy.canvasGraphFilterAddLabel,
    }) as HTMLButtonElement;
    const clear = getByRole(document.body, 'button', {
      name: copy.canvasGraphFilterClearLabel,
    }) as HTMLButtonElement;
    expect(add.disabled).toBe(true);
    expect(clear.disabled).toBe(true);
    act(() => {
      add.click();
      clear.click();
    });
    for (const [name, method] of Object.entries(binding)) {
      if (name !== 'model') expect(method).not.toHaveBeenCalled();
    }
  });

  it('uses all current binding methods after replacement and leaves prior callbacks untouched', () => {
    const copy = resolveCanvasViewCopy('en');
    const predicate = { dimension: 'status', value: 'failed' } as const;
    const original = createBinding({ predicates: [predicate] });
    const replacement = createBinding({ predicates: [predicate] });
    act(() => root.render(<CanvasGraphFilterControl binding={original} copy={copy} />));
    act(() => root.render(<CanvasGraphFilterControl binding={replacement} copy={copy} />));
    for (const [name, method] of Object.entries(replacement)) {
      if (name !== 'model') expect(method).not.toHaveBeenCalled();
    }
    const removeLabel = copy.canvasGraphFilterRemoveLabelTemplate
      .replace('{dimension}', copy.canvasGraphFilterStatusDimensionLabel)
      .replace('{value}', predicate.value);
    act(() => {
      fireEvent.change(
        getByRole(document.body, 'combobox', { name: copy.canvasGraphFilterDimensionLabel }),
        { target: { value: 'status' } }
      );
      fireEvent.change(
        getByRole(document.body, 'combobox', { name: copy.canvasGraphFilterValueLabel }),
        { target: { value: 'success' } }
      );
      fireEvent.click(getByRole(document.body, 'button', { name: copy.canvasGraphFilterAddLabel }));
      fireEvent.click(getByRole(document.body, 'button', { name: copy.canvasGraphFilterOrLabel }));
      fireEvent.click(
        getByRole(document.body, 'button', { name: copy.canvasGraphFilterHideLabel })
      );
      fireEvent.click(getByRole(document.body, 'button', { name: removeLabel }));
      fireEvent.click(
        getByRole(document.body, 'button', { name: copy.canvasGraphFilterClearLabel })
      );
      fireEvent.click(getByRole(document.body, 'button', { name: copy.canvasGraphFilterLabel }));
    });
    expect(replacement.setOpen).toHaveBeenCalledExactlyOnceWith(false);
    expect(replacement.selectDimension).toHaveBeenCalledExactlyOnceWith('status');
    expect(replacement.selectValue).toHaveBeenCalledExactlyOnceWith('success');
    expect(replacement.addDraftPredicate).toHaveBeenCalledOnce();
    expect(replacement.setComposition).toHaveBeenCalledExactlyOnceWith('or');
    expect(replacement.setPresentation).toHaveBeenCalledExactlyOnceWith('hide');
    expect(replacement.removePredicate).toHaveBeenCalledExactlyOnceWith(predicate);
    expect(replacement.clear).toHaveBeenCalledOnce();
    for (const [name, method] of Object.entries(original)) {
      if (name !== 'model') expect(method).not.toHaveBeenCalled();
    }
  });
});
