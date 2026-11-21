// @vitest-environment jsdom

/**
 * Owned concern: verify interactions over the shared bounded preview sample.
 * @baseline GH-3577-COMPACT-DATA-GRID: local controls never query or mutate source data.
 * @decision Await interaction work before asserting observable state and copy feedback.
 * @consequence Tests cover settled user behavior without fire-and-forget updates.
 * @version 1.0.0
 */
import { fireEvent, getByLabelText, getByRole } from '@testing-library/dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { OperationalDrawerDataTable } from './OperationalDrawerDataTable';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';

describe('OperationalDrawerDataTable', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    useApplicationLanguageStore.getState().configureApplicationLanguage('en');
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
    vi.unstubAllGlobals();
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
      Array.from(container.querySelectorAll('thead th[aria-sort]')).map(
        (header) => header.querySelector('button')?.textContent
      )
    ).toEqual(['customer', 'id']);
    expect(visibleRows()[0]).toEqual(['beta', '1']);

    act(() => {
      fireEvent.keyDown(customer, { altKey: true, key: 'ArrowRight' });
    });
    expect(
      Array.from(container.querySelectorAll('thead th[aria-sort]')).map(
        (header) => header.querySelector('button')?.textContent
      )
    ).toEqual(['id', 'customer']);
    expect(visibleRows()[0]).toEqual(['1', 'beta']);
  });

  it('filters only loaded rows and provides compact density and wrapping controls', async () => {
    renderTable();
    const search = getByRole(container, 'searchbox', { name: 'Search loaded rows' });
    await act(() => fireEvent.change(search, { target: { value: 'ALPHA' } }));
    expect(visibleRows()).toEqual([
      ['2', 'alpha'],
      ['3', 'alpha'],
    ]);
    expect(container.textContent).toContain('2 / 4 loaded rows');
    const grid = container.querySelector('[data-slot="bottom-operational-data-grid"]')!;
    expect(grid.getAttribute('data-density')).toBe('compact');
    await act(() => fireEvent.click(getByRole(container, 'button', { name: 'Comfortable rows' })));
    expect(grid.getAttribute('data-density')).toBe('comfortable');
    await act(() => fireEvent.click(getByRole(container, 'button', { name: 'Wrap text' })));
    expect(grid.getAttribute('data-wrap')).toBe('true');
    await act(() => fireEvent.change(search, { target: { value: 'absent' } }));
    expect(visibleRows()).toEqual([]);
    expect(container.textContent).toContain('No matching rows in this sample');
  });

  it('copies the selected full cell and rejects stale selection after replacing rows', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    renderTable();
    const copy = getByRole(container, 'button', { name: 'Copy cell' });
    expect((copy as HTMLButtonElement).disabled).toBe(true);
    await act(() => fireEvent.click(getByRole(container, 'button', { name: 'beta' })));
    await act(async () => fireEvent.click(copy));
    expect(writeText).toHaveBeenCalledWith('beta');
    expect(container.textContent).toContain('Cell copied');
    renderTable();
    expect((copy as HTMLButtonElement).disabled).toBe(true);
  });

  it('uses Ctrl to extend a rectangle and toggle separate cells without copying the gaps', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    renderTable();
    const cell = (row: number, column: number): HTMLButtonElement =>
      container.querySelectorAll('tbody tr')[row]!.querySelectorAll<HTMLButtonElement>('td button')[
        column
      ]!;
    const selected = (): (string | null)[] =>
      Array.from(
        container.querySelectorAll('td[data-selected="true"]'),
        (item) => item.textContent
      );
    const control = async (name: string): Promise<void> => {
      await act(async () =>
        fireEvent.keyDown(document.activeElement!, { key: name, ctrlKey: true })
      );
    };

    act(() => {
      cell(0, 0).focus();
      fireEvent.click(cell(0, 0));
    });
    await control('ArrowRight');
    await control('ArrowDown');
    expect(document.activeElement).toBe(cell(1, 1));
    expect(selected()).toEqual(['1', 'beta', '2', 'alpha']);
    await control('c');
    expect(writeText).toHaveBeenLastCalledWith('1\tbeta\n2\talpha');
    expect(getByRole(container, 'status').textContent).toBe('Range copied');

    await act(() => fireEvent.click(cell(0, 0)));
    await act(() => fireEvent.click(cell(1, 0), { ctrlKey: true }));
    await act(() => fireEvent.click(cell(1, 0), { ctrlKey: true }));
    await act(() => fireEvent.click(cell(3, 1), { ctrlKey: true }));
    expect(selected()).toEqual(['1', 'NULL']);
    await act(async () => fireEvent.click(getByRole(container, 'button', { name: 'Copy range' })));
    expect(writeText).toHaveBeenLastCalledWith('1\t\n\t\n\t\n\tNULL');
    await act(() => fireEvent.click(getByRole(container, 'button', { name: 'customer' })));
    expect(selected()).toEqual(['NULL']);
  });

  it('reports clipboard failure without pretending success', async () => {
    vi.stubGlobal('navigator', {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    });
    renderTable();
    await act(() => fireEvent.click(getByRole(container, 'button', { name: 'NULL' })));
    await act(async () => fireEvent.click(getByRole(container, 'button', { name: 'Copy cell' })));
    expect(container.textContent).toContain('Could not copy the cell');
    expect(container.textContent).not.toContain('Cell copied');
  });

  it('distinguishes NULL from empty text and filters a column whose first value is NULL', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    act(() =>
      root.render(
        <OperationalDrawerDataTable
          caption="Nullable"
          columns={[{ name: 'value', type: 'text' }]}
          nullValueLabel="NULL"
          rows={[{ values: [null] }, { values: [''] }, { values: ['needle'] }]}
        />
      )
    );
    await act(() => fireEvent.click(getByRole(container, 'button', { name: 'Empty text' })));
    await act(async () => fireEvent.click(getByRole(container, 'button', { name: 'Copy cell' })));
    expect(writeText).toHaveBeenLastCalledWith('');
    await act(() =>
      fireEvent.change(getByRole(container, 'searchbox'), { target: { value: 'needle' } })
    );
    expect(visibleRows()).toEqual([['needle']]);
  });

  it('localizes controls and feedback without changing the sample', async () => {
    renderTable();
    act(() => useApplicationLanguageStore.getState().configureApplicationLanguage('es'));
    expect(
      getByRole(container, 'searchbox', { name: 'Buscar en las filas cargadas' })
    ).toBeTruthy();
    expect(getByRole(container, 'button', { name: 'Copiar celda' })).toBeTruthy();
    const swatch = getByLabelText<HTMLInputElement>(container, 'Color de fondo de Datos');
    const grid = getByRole(container, 'region', { name: 'Sample' });
    expect(swatch.value).toBe('#191a1c');
    await act(() => fireEvent.input(swatch, { target: { value: '#284560' } }));
    expect(grid.style.getPropertyValue('--grid-primary')).toBe('#284560');
    expect(visibleRows()[0]).toEqual(['1', 'beta']);
  });

  it('combines one column filter with loaded-row search and clears the column independently', async () => {
    renderTable();
    const funnel = getByRole(container, 'button', { name: 'Filter customer' });
    await act(() => fireEvent.click(funnel));
    const columnFilter = getByRole(document.body, 'searchbox', { name: 'Filter customer' });
    const search = getByRole(container, 'searchbox', { name: 'Search loaded rows' });

    await act(() => fireEvent.change(columnFilter, { target: { value: 'alpha' } }));
    expect(visibleRows()).toEqual([
      ['2', 'alpha'],
      ['3', 'alpha'],
    ]);
    expect(funnel.getAttribute('data-active')).toBe('true');

    await act(() => fireEvent.change(search, { target: { value: 'beta' } }));
    expect(visibleRows()).toEqual([]);
    await act(() => fireEvent.change(columnFilter, { target: { value: '' } }));
    expect(visibleRows()).toEqual([['1', 'beta']]);
    expect(funnel.getAttribute('data-active')).toBe('false');

    await act(() => fireEvent.change(search, { target: { value: '' } }));
    await act(() => fireEvent.change(columnFilter, { target: { value: 'alpha' } }));
    await act(() => fireEvent.click(funnel));
    const secondFunnel = getByRole(container, 'button', { name: 'Filter id' });
    await act(() => fireEvent.click(secondFunnel));
    const secondFilter = getByRole(document.body, 'searchbox', { name: 'Filter id' });
    await act(() => fireEvent.change(secondFilter, { target: { value: '2' } }));
    expect(visibleRows()).toEqual([['2', 'alpha']]);
    expect(funnel.querySelector('sup')?.textContent).toBe('1');
    expect(secondFunnel.querySelector('sup')?.textContent).toBe('2');

    await act(() => fireEvent.click(secondFunnel));
    await act(() => fireEvent.click(funnel));
    await act(() =>
      fireEvent.change(getByRole(document.body, 'searchbox', { name: 'Filter customer' }), {
        target: { value: '' },
      })
    );
    expect(visibleRows()).toEqual([['2', 'alpha']]);
    expect(secondFunnel.querySelector('sup')?.textContent).toBe('1');
  });

  it('keeps the primary sort when adding a tie-breaker and filtering the ordered rows', async () => {
    renderTable();
    const customer = getByRole(container, 'button', { name: 'customer' });
    const id = getByRole(container, 'button', { name: 'id' });
    await act(() => fireEvent.click(customer));
    await act(() => fireEvent.click(id));
    await act(() => fireEvent.click(id));
    expect(visibleRows().map(([value]) => value)).toEqual(['3', '2', '1', '4']);
    expect(customer.closest('th')?.getAttribute('aria-sort')).toBe('ascending');
    expect(customer.querySelector('sup')?.textContent).toBe('1');
    expect(id.querySelector('sup')?.textContent).toBe('2');

    await act(() => fireEvent.click(getByRole(container, 'button', { name: 'Filter customer' })));
    const filter = getByRole(document.body, 'searchbox', { name: 'Filter customer' });
    await act(() => fireEvent.change(filter, { target: { value: 'alpha' } }));
    expect(visibleRows().map(([value]) => value)).toEqual(['3', '2']);
    await act(() => fireEvent.change(filter, { target: { value: '' } }));
    expect(visibleRows().map(([value]) => value)).toEqual(['3', '2', '1', '4']);
  });

  it('hides columns with their cells and restores their position and active sort', async () => {
    renderTable();
    const customer = getByRole(container, 'button', { name: 'customer' });
    await act(() => fireEvent.click(customer));
    await act(() => fireEvent.click(getByRole(container, 'button', { name: 'beta' })));
    const columns = getByRole(container, 'button', { name: 'Show or hide columns' });
    await act(() => fireEvent.click(columns));
    const dialog = getByRole(document.body, 'dialog', { name: 'Show or hide columns' });
    const toggle = getByRole(dialog, 'button', { name: 'Show customer' });
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    await act(() => fireEvent.click(toggle));
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(customer.isConnected).toBe(false);
    expect(visibleRows()).toEqual([['2'], ['3'], ['1'], ['4']]);
    expect(getByRole(container, 'button', { name: 'Copy cell' })).toHaveProperty('disabled', true);

    const toggleId = getByRole(dialog, 'button', { name: 'Show id' });
    await act(() => fireEvent.click(toggleId));
    expect(container.textContent).toContain('All columns are hidden');
    await act(() => fireEvent.click(toggleId));
    await act(() => fireEvent.click(toggle));
    expect(visibleRows()[0]).toEqual(['2', 'alpha']);
    expect(getByRole(container, 'button', { name: 'customer' }).closest('th')).toHaveProperty(
      'ariaSort',
      'ascending'
    );
  });
});
