// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { GraphNodeColumnSection } from './GraphNodeColumnSection';

describe('GraphNodeColumnSection functional composition', () => {
  let container: HTMLDivElement;
  let root: Root;
  let previousActEnvironment: boolean | undefined;
  let previousResizeObserver: typeof ResizeObserver | undefined;

  beforeEach(() => {
    const globalObject = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
    previousActEnvironment = globalObject.IS_REACT_ACT_ENVIRONMENT;
    globalObject.IS_REACT_ACT_ENVIRONMENT = true;
    previousResizeObserver = globalThis.ResizeObserver;
    globalThis.ResizeObserver = class implements ResizeObserver {
      disconnect(): void {}
      observe(): void {}
      unobserve(): void {}
    };
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    useApplicationLanguageStore.setState({ language: 'es' });
  });

  afterEach(() => {
    vi.useRealTimers();
    act(() => root.unmount());
    container.remove();
    document
      .querySelectorAll('[data-slot="graph-node-column-composition-menu"]')
      .forEach((element) => element.remove());
    const globalObject = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
    globalObject.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
    if (previousResizeObserver === undefined) {
      Reflect.deleteProperty(globalThis, 'ResizeObserver');
    } else {
      globalThis.ResizeObserver = previousResizeObserver;
    }
  });

  async function openCompatibleCompositionMenu(): Promise<{
    onColumnFunctionApply: ReturnType<typeof vi.fn>;
    onColumnReorder: ReturnType<typeof vi.fn>;
  }> {
    const onColumnFunctionApply = vi.fn();
    const onColumnReorder = vi.fn();
    await act(async () => {
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
                items: [{ capabilityId: 'capability:upper', name: 'upper' }],
              },
            },
            { id: 'output:buyer', name: 'buyer', type: 'text' },
          ]}
          onColumnFunctionApply={onColumnFunctionApply}
          onColumnReorder={onColumnReorder}
        />
      );
    });
    await act(async () => {
      fireEvent.click(
        container.querySelector<HTMLButtonElement>('[data-slot="graph-node-column-toggle"]')!
      );
    });

    const rows = container.querySelectorAll<HTMLElement>('[data-slot="graph-node-column-row"]');
    const pieces = container.querySelectorAll<HTMLElement>('[data-slot="graph-node-column-piece"]');
    const targetRow = rows[1]!;
    targetRow.getBoundingClientRect = () =>
      ({ top: 0, bottom: 90, height: 90, left: 0, right: 300, width: 300, x: 0, y: 0 }) as DOMRect;
    const dataTransfer = { effectAllowed: 'none', dropEffect: 'none', setData: vi.fn() };
    const dispatchDragAt = (type: 'dragover' | 'drop', clientY: number): void => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperties(event, {
        clientY: { value: clientY },
        dataTransfer: { value: dataTransfer },
      });
      targetRow.dispatchEvent(event);
    };

    await act(async () => {
      fireEvent.dragStart(pieces[0]!, { dataTransfer });
      dispatchDragAt('dragover', 45);
    });
    expect(dataTransfer.effectAllowed).toBe('linkMove');
    expect(dataTransfer.dropEffect).toBe('link');
    expect(targetRow.getAttribute('data-drop-placement')).toBe('compose');

    await act(async () => {
      dispatchDragAt('drop', 45);
      await Promise.resolve();
    });

    expect(onColumnFunctionApply).not.toHaveBeenCalled();
    expect(onColumnReorder).not.toHaveBeenCalled();
    expect(
      document.body.querySelector('[data-slot="graph-node-column-composition-menu"]')
    ).not.toBeNull();

    return { onColumnFunctionApply, onColumnReorder };
  }

  it('keeps a centre-drop choice open until the user selects an operation', async () => {
    vi.useFakeTimers();
    const { onColumnFunctionApply, onColumnReorder } = await openCompatibleCompositionMenu();

    await act(async () => {
      vi.advanceTimersByTime(3_000);
      await Promise.resolve();
    });

    expect(
      document.body.querySelector('[data-slot="graph-node-column-composition-menu"]')
    ).not.toBeNull();
    expect(onColumnFunctionApply).not.toHaveBeenCalled();
    expect(onColumnReorder).not.toHaveBeenCalled();

    const functionChoice = document.body.querySelector<HTMLElement>(
      '[data-slot="graph-node-column-composition-function"]'
    );
    expect(functionChoice).not.toBeNull();
    await act(async () => {
      fireEvent.click(functionChoice!);
    });

    expect(
      document.body.querySelector('[data-slot="graph-node-column-composition-menu"]')
    ).toBeNull();
    expect(onColumnFunctionApply).not.toHaveBeenCalled();
    const aliasInput = document.body.querySelector<HTMLInputElement>(
      '[data-slot="graph-node-column-function-alias-input"]'
    );
    await act(async () => {
      fireEvent.change(aliasInput!, { target: { value: 'buyer_clean' } });
      fireEvent.submit(aliasInput!.closest('form')!);
    });
    expect(onColumnFunctionApply).toHaveBeenCalledWith({
      nodeId: 'transform-orders',
      columnId: 'output:buyer',
      sourceColumnId: 'output:customer',
      capabilityId: 'capability:upper',
      alias: 'buyer_clean',
    });
  });

  it('dismisses the composition decision on Escape', async () => {
    await openCompatibleCompositionMenu();

    await act(async () => {
      fireEvent.keyDown(document, { key: 'Escape' });
      await Promise.resolve();
    });

    expect(
      document.body.querySelector('[data-slot="graph-node-column-composition-menu"]')
    ).toBeNull();
  });

  it('dismisses the composition decision on an outside pointer interaction', async () => {
    await openCompatibleCompositionMenu();

    await act(async () => {
      fireEvent.pointerDown(container);
      fireEvent.click(container);
      await Promise.resolve();
    });

    expect(
      document.body.querySelector('[data-slot="graph-node-column-composition-menu"]')
    ).toBeNull();
  });

  it('ignores a centre drop onto the dragged field itself', async () => {
    const onColumnFunctionApply = vi.fn();
    await act(async () => {
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
                items: [{ capabilityId: 'capability:upper', name: 'upper' }],
              },
            },
          ]}
          onColumnFunctionApply={onColumnFunctionApply}
          onColumnReorder={vi.fn()}
        />
      );
    });
    await act(async () => {
      fireEvent.click(
        container.querySelector<HTMLButtonElement>('[data-slot="graph-node-column-toggle"]')!
      );
    });

    const row = container.querySelector<HTMLElement>('[data-slot="graph-node-column-row"]')!;
    const piece = container.querySelector<HTMLElement>('[data-slot="graph-node-column-piece"]')!;
    row.getBoundingClientRect = () =>
      ({ top: 0, bottom: 90, height: 90, left: 0, right: 300, width: 300, x: 0, y: 0 }) as DOMRect;
    const dataTransfer = { effectAllowed: 'none', dropEffect: 'none', setData: vi.fn() };
    const drop = new Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperties(drop, {
      clientY: { value: 45 },
      dataTransfer: { value: dataTransfer },
    });

    await act(async () => {
      fireEvent.dragStart(piece, { dataTransfer });
      row.dispatchEvent(drop);
      await Promise.resolve();
    });

    expect(
      document.body.querySelector('[data-slot="graph-node-column-composition-menu"]')
    ).toBeNull();
    expect(onColumnFunctionApply).not.toHaveBeenCalled();
  });
});
