// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { GraphNodeColumnSection } from './GraphNodeColumnSection';

describe('GraphNodeColumnFunctionMenu pointer lifecycle', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.useFakeTimers();
    useApplicationLanguageStore.setState({ language: 'es' });
    const globalObject = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
    globalObject.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() => {
      root.render(
        <GraphNodeColumnSection
          nodeId="transform-orders"
          columns={[
            {
              id: 'output:customer',
              name: 'customer',
              type: 'text',
              functionMenu: {
                category: 'text',
                items: [
                  {
                    capabilityId: 'capability:trim',
                    name: 'trim',
                    minimumArgumentCount: 1,
                    maximumArgumentCount: 1,
                  },
                ],
              },
            },
          ]}
          onColumnFunctionApply={vi.fn()}
        />
      );
    });
    act(() => {
      fireEvent.click(
        container.querySelector<HTMLButtonElement>('[data-slot="graph-node-column-toggle"]')!
      );
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.useRealTimers();
  });

  it('keeps pointer and keyboard menus open until an explicit close gesture', async () => {
    const piece = container.querySelector<HTMLElement>('[data-slot="graph-node-column-piece"]')!;
    act(() => {
      piece.dispatchEvent(
        new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2 })
      );
    });
    expect(menu()).not.toBeNull();

    await act(async () => vi.advanceTimersByTimeAsync(3_000));
    expect(menu()).not.toBeNull();

    act(() => {
      fireEvent.keyDown(document.body, { key: 'Escape' });
    });
    expect(menu()).toBeNull();

    act(() => {
      fireEvent.keyDown(
        container.querySelector<HTMLElement>('[data-slot="graph-node-column-piece"]')!,
        { key: 'F10', shiftKey: true }
      );
    });
    await act(async () => vi.advanceTimersByTimeAsync(2_000));

    expect(menu()).not.toBeNull();
  });

  function menu(): Element | null {
    return document.querySelector('[data-slot="graph-node-column-function-menu"]');
  }

  it.each(['pointer', 'keyboard'] as const)(
    'opens the existing alias form for the selected output through %s without changing the original',
    async (gesture) => {
      const onCalculatedColumnAdd = vi.fn().mockReturnValue({
        outcome: 'applied',
        createdFieldId: 'output:amount_alias',
      });
      const columns = [
        { id: 'output:customer', name: 'customer', type: 'text' },
        { id: 'output:amount', name: 'amount', type: 'numeric' },
      ];
      act(() => {
        root.render(
          <GraphNodeColumnSection
            expanded
            nodeId="transform-orders"
            columns={columns}
            onCalculatedColumnAdd={onCalculatedColumnAdd}
          />
        );
      });
      const openAlias = async (): Promise<HTMLFormElement> => {
        const piece = container.querySelector<HTMLElement>('[data-column-name="amount"]')!;
        act(() => {
          if (gesture === 'pointer') fireEvent.contextMenu(piece);
          else fireEvent.keyDown(piece, { key: 'F10', shiftKey: true });
        });
        const aliasAction = menu()?.querySelector<HTMLElement>(
          '[data-slot="graph-node-column-alias-action"]'
        );
        expect(aliasAction).not.toBeNull();
        expect(aliasAction).toBeDefined();
        await act(async () => {
          fireEvent.click(aliasAction!);
          await vi.advanceTimersByTimeAsync(100);
        });
        const form = document.querySelector<HTMLFormElement>(
          '[data-slot="graph-node-calculated-column-form"] form'
        )!;
        expect(form).not.toBeNull();
        expect((form.elements.namedItem('inputFieldId') as HTMLSelectElement).value).toBe(
          'output:amount'
        );
        return form;
      };

      const cancelled = await openAlias();
      act(() => {
        fireEvent.click(
          Array.from(cancelled.querySelectorAll('button')).find(
            (button) => button.textContent === 'Cancelar'
          )!
        );
      });
      expect(onCalculatedColumnAdd).not.toHaveBeenCalled();
      const form = await openAlias();
      act(() => {
        fireEvent.input(form.elements.namedItem('alias') as HTMLInputElement, {
          target: { value: 'amount_alias' },
        });
      });
      act(() => {
        fireEvent.submit(form);
      });
      expect(onCalculatedColumnAdd).toHaveBeenCalledExactlyOnceWith({
        nodeId: 'transform-orders',
        kind: 'field-ref',
        inputFieldId: 'output:amount',
        alias: 'amount_alias',
      });
      expect(container.querySelector('[data-column-name="amount"]')).not.toBeNull();
      expect(columns).toHaveLength(2);
    }
  );
});
