// @vitest-environment jsdom

import { fireEvent, getByRole } from '@testing-library/dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildSourceImportCatalogViewModel } from './sourceImportWizardModel';
import { SourceImportCatalogView } from './SourceImportCatalogView';
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
    const catalog = buildSourceImportCatalogViewModel({
      activeTableKey: null,
      tables: [
        buildTable({
          table: 'ORDERS',
          rowCount: 1500,
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
          onToggleSchema={onToggleSchema}
          onToggleTable={onToggleTable}
        />
      );
    });

    expect(container.textContent).toContain('ERP');
    expect(container.textContent).toContain('1 table');
    expect(container.textContent).toContain('RAW.ERP.ORDERS');
    expect(container.textContent).toContain('1,500 rows');
    expect(container.textContent).toContain('2 columns');
    expect(container.textContent).toContain('order_id');
    expect(container.textContent).toContain('Required');
    expect(container.textContent).toContain('discount_code');
    expect(container.textContent).toContain('Nullable');

    const tableAction = getByRole(container, 'button', {
      name: 'Select source table RAW.ERP.ORDERS. 1,500 rows. 2 columns.',
    });

    await act(async () => {
      fireEvent.click(container.querySelector('[data-source-import-schema="ERP"]')!);
      fireEvent.keyDown(tableAction, { key: 'Enter' });
    });

    expect(onToggleSchema).toHaveBeenCalledWith('ERP');
    expect(onToggleTable).toHaveBeenCalledWith(0);
  });
});
