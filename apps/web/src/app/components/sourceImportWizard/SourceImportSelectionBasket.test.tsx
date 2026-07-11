// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { sourceImportCatalogNumberFormatter, sourceImportWizardCopy } from './copy';
import {
  buildSourceImportTableViewModel,
  type SourceImportTableViewModel,
} from './sourceImportCatalogModel';
import { SourceImportSelectionBasket } from './SourceImportSelectionBasket';
import { buildSourceImportTestObject } from './sourceImportWizard.testFixtures';
import type { TableInfo } from './types';

function buildTable(overrides?: Parameters<typeof buildSourceImportTestObject>[0]): TableInfo {
  return buildSourceImportTestObject({
    selected: true,
    columns: [
      { name: 'order_id', type: 'INTEGER', nullable: false },
      { name: 'discount_code', type: 'TEXT', nullable: true },
    ],
    constraints: [{ name: 'orders_pkey', kind: 'primary-key', columns: ['order_id'] }],
    ...overrides,
  });
}

function buildSelectedTable(table: TableInfo, index = 0): SourceImportTableViewModel {
  return buildSourceImportTableViewModel(
    table,
    index,
    sourceImportWizardCopy.catalog,
    sourceImportCatalogNumberFormatter
  );
}

describe('SourceImportSelectionBasket', () => {
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

  it('renders selected source columns and missing-column metadata before import', async () => {
    const onRemoveTable = vi.fn();

    await act(async () => {
      root.render(
        <SourceImportSelectionBasket
          selectedTables={[
            buildSelectedTable(buildTable()),
            buildSelectedTable(
              buildTable({
                schema: 'CRM',
                table: 'CUSTOMERS',
                columns: [],
              }),
              1
            ),
          ]}
          onRemoveTable={onRemoveTable}
        />
      );
    });

    expect(container.textContent).toContain('RAW.ERP.ORDERS');
    expect(container.textContent).toContain('1,500 rows');
    expect(container.textContent).toContain('3.9 MB');
    expect(container.textContent).toContain('2 columns');
    expect(container.textContent).toContain('order_id');
    expect(container.textContent).toContain('INTEGER');
    expect(container.textContent).toContain('Primary key');
    expect(container.textContent).toContain('Required');
    expect(container.textContent).toContain('discount_code');
    expect(container.textContent).toContain('TEXT');
    expect(container.textContent).toContain('Nullable');
    expect(container.textContent).toContain('RAW.CRM.CUSTOMERS');
    expect(container.textContent).toContain(sourceImportWizardCopy.selectionBasket.noColumns);

    expect(
      container.querySelector('[data-source-import-selected-column="RAW.ERP.ORDERS.order_id"]')
    ).not.toBeNull();
    expect(
      container.querySelector('[data-source-import-selected-column="RAW.ERP.ORDERS.discount_code"]')
    ).not.toBeNull();
  });
});
