// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import React, { act, Profiler } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { GraphNodeColumnSection } from './GraphNodeColumnSection';

describe('GraphNodeColumnSection inactive field reorder', () => {
  let container: HTMLDivElement;
  let root: Root;
  let previousActEnvironment: boolean | undefined;

  beforeEach(() => {
    const globalObject = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
    previousActEnvironment = globalObject.IS_REACT_ACT_ENVIRONMENT;
    globalObject.IS_REACT_ACT_ENVIRONMENT = true;
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      }
    );
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    useApplicationLanguageStore.setState({ language: 'es' });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    const globalObject = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
    globalObject.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
    vi.unstubAllGlobals();
  });

  it('moves an inactive field and activates it at the chosen position', async () => {
    const onColumnOutputToggle = vi.fn();
    const onColumnReorder = vi.fn();
    await act(async () => {
      root.render(
        <GraphNodeColumnSection
          nodeId="transform-orders"
          columns={[
            { id: 'output:first', name: 'first', type: 'text', output: true },
            { id: 'second', name: 'second', type: 'text', output: false },
            { id: 'output:third', name: 'third', type: 'text', output: true },
          ]}
          onColumnOutputToggle={onColumnOutputToggle}
          onColumnReorder={onColumnReorder}
        />
      );
    });
    await act(async () => {
      fireEvent.click(
        container.querySelector<HTMLButtonElement>('[data-slot="graph-node-column-toggle"]')!
      );
    });

    const inactivePiece = [
      ...container.querySelectorAll<HTMLElement>('[data-slot="graph-node-column-piece"]'),
    ].find((piece) => piece.textContent?.includes('second'));
    expect(inactivePiece?.getAttribute('draggable')).toBe('true');

    await act(async () => {
      fireEvent.keyDown(inactivePiece!, { key: 'ArrowUp', altKey: true });
    });
    const orderedNames = [
      ...container.querySelectorAll<HTMLElement>('[data-slot="graph-node-column-piece"]'),
    ].map((piece) =>
      piece
        .querySelector('[data-slot="graph-node-column-output-state"]')
        ?.getAttribute('aria-label')
    );
    expect(orderedNames[0]).toContain('second');
    expect(onColumnReorder).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(
        container.querySelector<HTMLButtonElement>('[data-slot="graph-node-column-output-state"]')!
      );
    });
    expect(onColumnOutputToggle).toHaveBeenCalledWith({
      nodeId: 'transform-orders',
      columnId: 'second',
      columnType: 'text',
      output: true,
      placement: { targetColumnId: 'output:first', placement: 'before' },
    });
  });

  it('keeps a field in place when its output identity changes', async () => {
    const committedNames: string[][] = [];
    const onColumnOutputToggle = vi.fn();
    const renderColumns = (
      columns: Parameters<typeof GraphNodeColumnSection>[0]['columns']
    ): void => {
      root.render(
        <Profiler
          id="columns"
          onRender={() => {
            committedNames.push(
              [
                ...container.querySelectorAll<HTMLElement>('[data-slot="graph-node-column-piece"]'),
              ].map((piece) => piece.dataset.columnName!)
            );
          }}
        >
          <GraphNodeColumnSection
            nodeId="transform-orders"
            columns={columns}
            onColumnOutputToggle={onColumnOutputToggle}
            onColumnReorder={vi.fn()}
          />
        </Profiler>
      );
    };
    await act(async () => {
      renderColumns([
        { id: 'output:customer', name: 'customer', type: 'text', output: true },
        { id: 'amount', name: 'amount', type: 'numeric', output: false },
        { id: 'output:order_id', name: 'order_id', type: 'integer', output: true },
      ]);
    });
    await act(async () => {
      fireEvent.click(
        container.querySelector<HTMLButtonElement>('[data-slot="graph-node-column-toggle"]')!
      );
    });
    const piecesBefore = [
      ...container.querySelectorAll<HTMLElement>('[data-slot="graph-node-column-piece"]'),
    ];
    const toggleBefore = piecesBefore[0]!.querySelector<HTMLButtonElement>(
      '[data-slot="graph-node-column-output-state"]'
    )!;
    await act(async () => toggleBefore.focus());
    committedNames.length = 0;

    await act(async () => {
      renderColumns([
        { id: 'output:order_id', name: 'order_id', type: 'integer', output: true },
        { id: 'customer', name: 'customer', type: 'text', output: false },
        { id: 'amount', name: 'amount', type: 'numeric', output: false },
      ]);
    });

    expect(
      [...container.querySelectorAll<HTMLElement>('[data-slot="graph-node-column-piece"]')].map(
        (piece) => piece.textContent
      )
    ).toEqual(['customertext', 'amountnumeric', 'order_idinteger']);
    expect(committedNames.length).toBeGreaterThan(0);
    expect(committedNames.every((names) => names.join(',') === 'customer,amount,order_id')).toBe(
      true
    );
    const piecesAfter = [
      ...container.querySelectorAll<HTMLElement>('[data-slot="graph-node-column-piece"]'),
    ];
    piecesAfter.forEach((piece, index) => expect(piece).toBe(piecesBefore[index]));
    expect(document.activeElement).toBe(toggleBefore);
    expect(toggleBefore.getAttribute('aria-pressed')).toBe('false');
    await act(async () => fireEvent.click(toggleBefore));
    expect(onColumnOutputToggle).toHaveBeenCalledWith(
      expect.objectContaining({ columnId: 'customer', output: true })
    );

    await act(async () => {
      renderColumns([
        { id: 'output:order_id', name: 'order_id', type: 'integer', output: true },
        { id: 'output:customer:v2', name: 'customer', type: 'text', output: true },
        { id: 'amount', name: 'amount', type: 'numeric', output: false },
      ]);
    });
    expect(document.activeElement).toBe(toggleBefore);
    expect(toggleBefore.getAttribute('aria-pressed')).toBe('true');
    expect(committedNames.every((names) => names.join(',') === 'customer,amount,order_id')).toBe(
      true
    );
    await act(async () => fireEvent.click(toggleBefore));
    expect(onColumnOutputToggle).toHaveBeenLastCalledWith(
      expect.objectContaining({ columnId: 'output:customer:v2', output: false })
    );
  });

  it('moves an inactive field among inactive fields without changing output selection', async () => {
    const onColumnReorder = vi.fn();
    await act(async () => {
      root.render(
        <GraphNodeColumnSection
          nodeId="transform-orders"
          columns={[
            { id: 'output:first', name: 'first', type: 'text', output: true },
            { id: 'second', name: 'second', type: 'text', output: false },
            { id: 'third', name: 'third', type: 'text', output: false },
            { id: 'output:fourth', name: 'fourth', type: 'text', output: true },
          ]}
          onColumnOutputToggle={vi.fn()}
          onColumnReorder={onColumnReorder}
        />
      );
    });
    await act(async () => {
      fireEvent.click(
        container.querySelector<HTMLButtonElement>('[data-slot="graph-node-column-toggle"]')!
      );
    });
    const pieces = [
      ...container.querySelectorAll<HTMLElement>('[data-slot="graph-node-column-piece"]'),
    ];

    await act(async () => {
      fireEvent.keyDown(pieces[1]!, { key: 'ArrowDown', altKey: true });
    });

    expect(
      [...container.querySelectorAll<HTMLElement>('[data-slot="graph-node-column-piece"]')].map(
        (piece) => piece.textContent
      )
    ).toEqual(['firsttext', 'thirdtext', 'secondtext', 'fourthtext']);
    expect(onColumnReorder).not.toHaveBeenCalled();
  });
});
