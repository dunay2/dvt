// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import type { GraphNodeColumnSectionProps } from './graphNodeColumnContracts';
import { GraphNodeColumnSection } from './GraphNodeColumnSection';

const columns = [
  { id: 'output:order_id', name: 'order_id', type: 'integer' },
  { id: 'output:customer', name: 'customer', type: 'text' },
] as const;

describe('GraphNodeColumnSection structured composition', () => {
  let container: HTMLDivElement;
  let root: Root;
  let onApply: ReturnType<
    typeof vi.fn<NonNullable<GraphNodeColumnSectionProps['onStructuredFieldApply']>>
  >;

  beforeEach(() => {
    onApply = vi
      .fn<NonNullable<GraphNodeColumnSectionProps['onStructuredFieldApply']>>()
      .mockReturnValue({ outcome: 'applied', createdFieldId: 'output:identity' });
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
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
    act(() => root.unmount());
    container.remove();
    document
      .querySelectorAll('[data-radix-popper-content-wrapper]')
      .forEach((node) => node.remove());
  });

  async function render(): Promise<HTMLElement[]> {
    await act(async () => {
      root.render(
        <GraphNodeColumnSection
          nodeId="transform-orders"
          columns={columns}
          onColumnReorder={vi.fn()}
          onStructuredFieldApply={onApply}
        />
      );
    });
    await act(async () => {
      fireEvent.click(container.querySelector('[data-slot="graph-node-column-toggle"]')!);
    });
    return [...container.querySelectorAll<HTMLElement>('[data-slot="graph-node-column-row"]')];
  }

  async function openStructuredField(): Promise<HTMLInputElement> {
    await act(async () => {
      fireEvent.click(
        document.body.querySelector('[data-slot="graph-node-column-composition-structured-field"]')!
      );
    });
    await act(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
    return document.body.querySelector<HTMLInputElement>(
      '[data-slot="graph-node-structured-field-name"]'
    )!;
  }

  async function chooseAndApply(name: string): Promise<void> {
    const input = await openStructuredField();
    expect(onApply).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.change(input, { target: { value: name } });
      fireEvent.submit(input.closest('form')!);
      await Promise.resolve();
    });
    expect(
      document.body.querySelector('[data-slot="graph-node-structured-field-form"]')
    ).toBeNull();
  }

  it('opens an explicit proposal after a centre drop and applies the ordered children', async () => {
    const rows = await render();
    const pieces = container.querySelectorAll<HTMLElement>('[data-slot="graph-node-column-piece"]');
    rows[0]!.getBoundingClientRect = () =>
      ({ top: 0, bottom: 90, height: 90, left: 0, right: 300, width: 300, x: 0, y: 0 }) as DOMRect;
    const dataTransfer = { effectAllowed: 'none', dropEffect: 'none', setData: vi.fn() };
    const dragEvent = (type: string): void => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperties(event, {
        clientY: { value: 45 },
        dataTransfer: { value: dataTransfer },
      });
      rows[0]!.dispatchEvent(event);
    };

    await act(async () => {
      fireEvent.dragStart(pieces[1]!, { dataTransfer });
      dragEvent('dragover');
    });
    expect(rows[0]!.dataset.dropPlacement).toBe('compose');
    await act(async () => dragEvent('drop'));
    await chooseAndApply('identity');

    expect(onApply).toHaveBeenCalledWith({
      nodeId: 'transform-orders',
      draggedFieldId: 'output:customer',
      targetFieldId: 'output:order_id',
      parentName: 'identity',
    });
  });

  it('opens the same proposal from the keyboard without mutating before Apply', async () => {
    const rows = await render();

    await act(async () => {
      fireEvent.keyDown(rows[1]!, { key: 'ArrowLeft', altKey: true });
    });
    expect(onApply).not.toHaveBeenCalled();
    await chooseAndApply('identity');

    expect(onApply).toHaveBeenCalledWith({
      nodeId: 'transform-orders',
      draggedFieldId: 'output:customer',
      targetFieldId: 'output:order_id',
      parentName: 'identity',
    });
  });

  it('proposes appending a scalar to an existing structured parent', async () => {
    await act(async () => {
      root.render(
        <GraphNodeColumnSection
          nodeId="transform-orders"
          columns={[
            {
              id: 'output:identity',
              name: 'identity',
              type: 'struct',
              children: columns,
            },
            { id: 'output:amount', name: 'amount', type: 'numeric' },
          ]}
          onColumnReorder={vi.fn()}
          onStructuredFieldApply={onApply}
        />
      );
      await Promise.resolve();
    });
    await act(async () => {
      fireEvent.click(container.querySelector('[data-slot="graph-node-column-toggle"]')!);
    });
    const rows = [
      ...container.querySelectorAll<HTMLElement>('[data-slot="graph-node-column-row"]'),
    ];
    await act(async () => {
      fireEvent.keyDown(rows[1]!, { key: 'ArrowLeft', altKey: true });
      await Promise.resolve();
    });
    const input = await openStructuredField();
    expect(input.value).toBe('identity');
    expect(onApply).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.submit(input.closest('form')!);
    });

    expect(onApply).toHaveBeenCalledWith({
      nodeId: 'transform-orders',
      draggedFieldId: 'output:amount',
      targetFieldId: 'output:identity',
      parentName: 'identity',
    });
    expect(
      document.body.querySelector('[data-slot="graph-node-structured-field-form"]')
    ).toBeNull();
  });

  it('keeps an oversized structured-field name visible and blocks Apply', async () => {
    const rows = await render();
    await act(async () => {
      fireEvent.keyDown(rows[1]!, { key: 'ArrowLeft', altKey: true });
    });
    const input = await openStructuredField();
    await act(async () => {
      fireEvent.change(input, { target: { value: '   ' } });
    });
    expect(input.value).toBe('   ');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(document.body.querySelector('[role="alert"]')?.textContent).toContain(
      'sin espacios exteriores'
    );

    const invalidName = 'x'.repeat(63).concat(' ');
    await act(async () => {
      fireEvent.change(input, { target: { value: invalidName } });
      fireEvent.submit(input.closest('form')!);
    });

    expect(input.value).toBe(invalidName);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(document.body.querySelector('[role="alert"]')?.textContent).toContain('63 bytes UTF-8');
    expect(onApply).not.toHaveBeenCalled();
  });
});
