// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { sourceImportCatalogNumberFormatter, sourceImportWizardCopy } from './copy';
import { SourceImportReviewView } from './SourceImportReviewView';
import { buildSourceImportTableViewModel } from './sourceImportCatalogModel';
import type { SourceImportTableViewModel } from './sourceImportCatalogModel';
import { buildPreviewGroups } from './sourceImportWizardModel';
import type { TableInfo } from './types';

function buildTable(overrides?: Partial<TableInfo>): TableInfo {
  return {
    database: 'RAW',
    schema: 'ERP',
    table: 'ORDERS',
    selected: true,
    rowCount: 1500,
    byteSize: 4096000,
    columns: [{ name: 'order_id', type: 'INTEGER', nullable: false, primaryKey: true }],
    ...overrides,
  };
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
          previewGroups={Array.from(buildPreviewGroups(selectedTables, 'schema').entries())}
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
    expect(
      container.querySelector('[data-source-import-registry-path="models/sources/src_erp.yml"]')
    ).not.toBeNull();
  });
});
