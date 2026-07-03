// @vitest-environment jsdom

import { fireEvent, getByRole } from '@testing-library/dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildSourceImportCatalogViewModel } from './sourceImportCatalogModel';
import { SourceImportCatalogView } from './SourceImportCatalogView';
import { sourceImportCatalogNumberFormatter, sourceImportWizardCopy } from './copy';
import type { TableInfo } from './types';

function buildTable(overrides?: Partial<TableInfo>): TableInfo {
  return {
    database: 'RAW',
    schema: 'ERP',
    table: 'ORDERS',
    selected: false,
    columns: [],
    ...overrides,
  };
}

describe('SourceImportCatalogView', () => {
  const catalogCopy = sourceImportWizardCopy.catalog;
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
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('renders source table metrics and delegates table/schema selection by model identity', async () => {
    const onToggleSchema = vi.fn();
    const onToggleTable = vi.fn();
    const onActivateTable = vi.fn();
    const catalog = buildSourceImportCatalogViewModel({
      activeTableKey: null,
      copy: catalogCopy,
      numberFormatter: sourceImportCatalogNumberFormatter,
      tables: [
        buildTable({
          table: 'ORDERS',
          rowCount: 1500,
          byteSize: 4096000,
          columns: [
            { name: 'order_id', type: 'INTEGER', nullable: false },
            { name: 'discount_code', type: 'TEXT', nullable: true },
          ],
        }),
      ],
    });

    await act(async () => {
      root.render(
        <SourceImportCatalogView
          catalog={catalog}
          emptyLabel="No source tables"
          onToggleDatabase={vi.fn()}
          onToggleSchema={onToggleSchema}
          onToggleTable={onToggleTable}
          onActivateTable={onActivateTable}
        />
      );
    });

    expect(container.textContent).toContain('ERP');
    expect(container.textContent).toContain('RAW');
    expect(container.textContent).toContain('1 table');
    expect(container.textContent).toContain('RAW.ERP.ORDERS');
    expect(container.textContent).toContain('1,500 rows');
    expect(container.textContent).toContain('3.9 MB');
    expect(container.textContent).toContain('2 columns');
    expect(container.textContent).toContain('order_id');
    expect(container.textContent).toContain('Required');
    expect(container.textContent).toContain('discount_code');
    expect(container.textContent).toContain('Nullable');

    const inspectAction = getByRole(container, 'button', {
      name: 'Inspect source table RAW.ERP.ORDERS metadata. 1,500 rows. 3.9 MB. 2 columns.',
    });
    const selectAction = getByRole(container, 'checkbox', {
      name: 'Select source table RAW.ERP.ORDERS. 1,500 rows. 3.9 MB. 2 columns.',
    });

    await act(async () => {
      fireEvent.click(container.querySelector('[data-source-import-schema="RAW.ERP"]')!);
      fireEvent.keyDown(inspectAction, { key: 'Enter' });
      fireEvent.click(selectAction);
    });

    expect(onToggleSchema).toHaveBeenCalledWith({ database: 'RAW', schema: 'ERP' });
    expect(onActivateTable).toHaveBeenCalledWith(0);
    expect(onToggleTable).toHaveBeenCalledWith(0);
  });

  it('renders database categories above schema groups without changing table selection behavior', async () => {
    const onToggleDatabase = vi.fn();
    const onToggleSchema = vi.fn();
    const onToggleTable = vi.fn();
    const onActivateTable = vi.fn();
    const catalog = buildSourceImportCatalogViewModel({
      activeTableKey: null,
      copy: catalogCopy,
      numberFormatter: sourceImportCatalogNumberFormatter,
      tables: [
        buildTable({ database: 'RAW', schema: 'ERP', table: 'ORDERS' }),
        buildTable({ database: 'RAW', schema: 'CRM', table: 'CUSTOMERS' }),
        buildTable({ database: 'MART', schema: 'FINANCE', table: 'REVENUE' }),
      ],
    });

    await act(async () => {
      root.render(
        <SourceImportCatalogView
          catalog={catalog}
          emptyLabel="No source tables"
          onToggleSchema={onToggleSchema}
          onToggleDatabase={onToggleDatabase}
          onToggleTable={onToggleTable}
          onActivateTable={onActivateTable}
        />
      );
    });

    expect(container.textContent).toContain('MART');
    expect(container.textContent).toContain('RAW');
    expect(container.textContent).toContain('2 schemas');
    expect(container.textContent).toContain('FINANCE');
    expect(container.textContent).toContain('ERP');
    expect(container.textContent).toContain('CRM');

    await act(async () => {
      fireEvent.click(container.querySelector('[data-source-import-database="RAW"]')!);
      fireEvent.click(container.querySelector('[data-source-import-schema="RAW.CRM"]')!);
    });

    expect(onToggleDatabase).toHaveBeenCalledWith({ database: 'RAW' });
    expect(onToggleSchema).toHaveBeenCalledWith({ database: 'RAW', schema: 'CRM' });
  });

  it('delegates schema selection with database scope when schemas share the same name', async () => {
    const onToggleSchema = vi.fn();
    const onToggleTable = vi.fn();
    const onActivateTable = vi.fn();
    const catalog = buildSourceImportCatalogViewModel({
      activeTableKey: null,
      copy: catalogCopy,
      numberFormatter: sourceImportCatalogNumberFormatter,
      tables: [
        buildTable({ database: 'RAW', schema: 'PUBLIC', table: 'ORDERS' }),
        buildTable({ database: 'MART', schema: 'PUBLIC', table: 'CUSTOMERS' }),
      ],
    });

    await act(async () => {
      root.render(
        <SourceImportCatalogView
          catalog={catalog}
          emptyLabel="No source tables"
          onToggleDatabase={vi.fn()}
          onToggleSchema={onToggleSchema}
          onToggleTable={onToggleTable}
          onActivateTable={onActivateTable}
        />
      );
    });

    const martPublic = container.querySelector('[data-source-import-schema="MART.PUBLIC"]');
    expect(martPublic).not.toBeNull();

    await act(async () => {
      fireEvent.click(martPublic!);
    });

    expect(onToggleSchema).toHaveBeenCalledWith({
      database: 'MART',
      schema: 'PUBLIC',
    });
  });

  it('keeps table inspection separate from source selection', async () => {
    const onToggleSchema = vi.fn();
    const onToggleTable = vi.fn();
    const onActivateTable = vi.fn();
    const catalog = buildSourceImportCatalogViewModel({
      activeTableKey: null,
      copy: catalogCopy,
      numberFormatter: sourceImportCatalogNumberFormatter,
      tables: [
        buildTable({
          table: 'ORDERS',
          rowCount: 1500,
          columns: [{ name: 'order_id', type: 'INTEGER', nullable: false }],
        }),
      ],
    });

    await act(async () => {
      root.render(
        <SourceImportCatalogView
          catalog={catalog}
          emptyLabel="No source tables"
          onToggleDatabase={vi.fn()}
          onToggleSchema={onToggleSchema}
          onToggleTable={onToggleTable}
          onActivateTable={onActivateTable}
        />
      );
    });

    await act(async () => {
      fireEvent.click(
        getByRole(container, 'button', {
          name: 'Inspect source table RAW.ERP.ORDERS metadata. 1,500 rows. 1 column.',
        })
      );
    });

    expect(onActivateTable).toHaveBeenCalledWith(0);
    expect(onToggleTable).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(
        getByRole(container, 'checkbox', {
          name: 'Select source table RAW.ERP.ORDERS. 1,500 rows. 1 column.',
        })
      );
    });

    expect(onToggleTable).toHaveBeenCalledWith(0);
  });
});
