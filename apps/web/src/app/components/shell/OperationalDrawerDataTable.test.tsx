// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { OperationalDrawerDataTable } from './OperationalDrawerDataTable';

describe('OperationalDrawerDataTable', () => {
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

  function renderTable(): void {
    act(() => {
      root.render(
        <OperationalDrawerDataTable
          caption="Sample"
          columns={[{ name: 'id' }, { name: 'customer' }]}
          nullValueLabel="NULL"
          rows={[
            { values: ['1', 'beta'] },
            { values: ['2', 'alpha'] },
            { values: ['3', 'alpha'] },
            { values: ['4', null] },
          ]}
        />
      );
    });
  }

  function visibleRows(): string[][] {
    return Array.from(container.querySelectorAll('tbody tr')).map((row) =>
      Array.from(row.querySelectorAll('td')).map((cell) => cell.textContent ?? '')
    );
  }

  it('cycles stable row sorting without mutating the source sample', () => {
    const rows = [
      { values: ['1', 'beta'] },
      { values: ['2', 'alpha'] },
      { values: ['3', 'alpha'] },
      { values: ['4', null] },
    ] as const;
    const snapshot = JSON.stringify(rows);

    act(() => {
      root.render(
        <OperationalDrawerDataTable
          caption="Sample"
          columns={[{ name: 'id' }, { name: 'customer' }]}
          nullValueLabel="NULL"
          rows={rows}
        />
      );
    });

    const customer = container.querySelector<HTMLButtonElement>('[data-column-id="customer"]')!;
    act(() => {
      fireEvent.click(customer);
    });
    expect(
      container
        .querySelector('[data-column-id="customer"]')
        ?.closest('th')
        ?.getAttribute('aria-sort')
    ).toBe('ascending');
    expect(visibleRows().map((row) => row[0])).toEqual(['2', '3', '1', '4']);

    act(() => {
      fireEvent.click(customer);
    });
    expect(
      container
        .querySelector('[data-column-id="customer"]')
        ?.closest('th')
        ?.getAttribute('aria-sort')
    ).toBe('descending');
    expect(visibleRows().map((row) => row[0])).toEqual(['1', '2', '3', '4']);

    act(() => {
      fireEvent.click(customer);
    });
    expect(
      container
        .querySelector('[data-column-id="customer"]')
        ?.closest('th')
        ?.getAttribute('aria-sort')
    ).toBe('none');
    expect(visibleRows().map((row) => row[0])).toEqual(['1', '2', '3', '4']);
    expect(JSON.stringify(rows)).toBe(snapshot);
  });

  it('moves each header together with its cells by drag and keyboard', () => {
    renderTable();
    const id = container.querySelector<HTMLButtonElement>('[data-column-id="id"]')!;
    const customer = container.querySelector<HTMLButtonElement>('[data-column-id="customer"]')!;
    const transfer = new Map<string, string>();
    const dataTransfer = {
      effectAllowed: 'move',
      dropEffect: 'move',
      setData: (type: string, value: string) => transfer.set(type, value),
      getData: (type: string) => transfer.get(type) ?? '',
    };

    act(() => {
      fireEvent.dragStart(customer, { dataTransfer });
      fireEvent.dragOver(id, { clientX: 0, dataTransfer });
      fireEvent.drop(id, { clientX: 0, dataTransfer });
    });

    expect(
      Array.from(container.querySelectorAll('th')).map((header) => header.textContent)
    ).toEqual(['customer', 'id']);
    expect(visibleRows()[0]).toEqual(['beta', '1']);

    act(() => {
      fireEvent.keyDown(customer, { altKey: true, key: 'ArrowRight' });
    });
    expect(
      Array.from(container.querySelectorAll('th')).map((header) => header.textContent)
    ).toEqual(['id', 'customer']);
    expect(visibleRows()[0]).toEqual(['1', 'beta']);
  });
});
