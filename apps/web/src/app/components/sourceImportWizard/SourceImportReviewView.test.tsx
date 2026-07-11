// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { sourceImportCatalogNumberFormatter, sourceImportWizardCopy } from './copy';
import { SourceImportReviewView } from './SourceImportReviewView';
import { buildSourceImportTableViewModel } from './sourceImportCatalogModel';
import type { SourceImportTableViewModel } from './sourceImportCatalogModel';
import { buildSourceImportReviewPreviewGroups } from './sourceImportReviewModel';
import { buildSourceImportTestObject } from './sourceImportWizard.testFixtures';
import type { TableInfo } from './types';

function buildTable(overrides?: Parameters<typeof buildSourceImportTestObject>[0]): TableInfo {
  return buildSourceImportTestObject({
    selected: true,
    columns: [{ name: 'order_id', type: 'INTEGER', nullable: false }],
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

describe('SourceImportReviewView', () => {
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

  it('renders the governed source registry path for each selected attachment group', async () => {
    const selectedTables = [
      buildTable({ database: 'RAW', schema: 'ERP', table: 'ORDERS' }),
      buildTable({ database: 'RAW', schema: 'ERP', table: 'CUSTOMERS' }),
    ];

    await act(async () => {
      root.render(
        <SourceImportReviewView
          selectedTables={selectedTables.map((table, index) => buildSelectedTable(table, index))}
          previewGroups={buildSourceImportReviewPreviewGroups({
            tables: selectedTables,
            groupingStrategy: 'schema',
            copy: sourceImportWizardCopy.catalog,
            numberFormatter: sourceImportCatalogNumberFormatter,
          })}
          selectedCount={2}
          groupingStrategy="schema"
          selectedConnectionName="Local warehouse"
          sourceImportOptions={[]}
          sourceImportOptionValues={{
            includeColumns: true,
            addTests: false,
            addFreshness: false,
          }}
          onRemoveTable={vi.fn()}
        />
      );
    });

    expect(container.textContent).toContain('Local warehouse');
    expect(container.textContent).toContain('2');
    expect(container.textContent).toContain(sourceImportWizardCopy.review.registryFileLabel);
    expect(container.textContent).toContain('models/sources/src_erp.yml');
    expect(container.textContent).toContain('1,500 rows');
    expect(container.textContent).toContain('3.9 MB');
    expect(container.textContent).toContain('1 column');
    expect(
      container.querySelector('[data-source-import-review-table="RAW.ERP.ORDERS"]')
    ).not.toBeNull();
    expect(
      container.querySelector('[data-source-import-registry-path="models/sources/src_erp.yml"]')
    ).not.toBeNull();
  });

  it('keeps review automation selectors separate from display names when identifiers contain dots', async () => {
    const selectedTables = [
      buildTable({ database: 'RAW.PROD', schema: 'PUBLIC', table: 'ORDERS' }),
      buildTable({ database: 'RAW', schema: 'PROD.PUBLIC', table: 'ORDERS' }),
    ];
    const selectedTableViewModels = selectedTables.map((table, index) =>
      buildSelectedTable(table, index)
    );

    await act(async () => {
      root.render(
        <SourceImportReviewView
          selectedTables={selectedTableViewModels}
          previewGroups={buildSourceImportReviewPreviewGroups({
            tables: selectedTables,
            groupingStrategy: 'database',
            copy: sourceImportWizardCopy.catalog,
            numberFormatter: sourceImportCatalogNumberFormatter,
          })}
          selectedCount={2}
          groupingStrategy="database"
          selectedConnectionName="Local warehouse"
          sourceImportOptions={[]}
          sourceImportOptionValues={{
            includeColumns: true,
            addTests: false,
            addFreshness: false,
          }}
          onRemoveTable={vi.fn()}
        />
      );
    });

    expect(container.textContent).toContain('RAW.PROD.PUBLIC.ORDERS');
    expect(
      Array.from(container.querySelectorAll('[data-source-import-review-table]')).map((element) =>
        element.getAttribute('data-source-import-review-table')
      )
    ).toEqual(['RAW.PROD.PUBLIC.ORDERS', 'RAW.PROD.PUBLIC.ORDERS']);
    expect(
      Array.from(container.querySelectorAll('[data-source-import-review-table-identity]')).map(
        (element) => element.getAttribute('data-source-import-review-table-identity')
      )
    ).toEqual(selectedTableViewModels.map((table) => table.identityKey));
  });
});
