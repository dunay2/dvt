// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { sourceImportCatalogNumberFormatter, sourceImportWizardCopy } from './copy';
import { buildSourceImportReviewPreviewGroups } from './sourceImportReviewModel';
import { SourceImportReviewView } from './SourceImportReviewView';
import type { TableInfo } from './types';

function buildTable(overrides?: Partial<TableInfo>): TableInfo {
  return {
    database: 'RAW',
    schema: 'ERP',
    table: 'ORDERS',
    selected: true,
    rowCount: 1500,
    byteSize: 4096000,
    columns: [
      { name: 'order_id', type: 'INTEGER', nullable: false },
      { name: 'customer_id', type: 'INTEGER', nullable: false },
    ],
    ...overrides,
  };
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

  it('renders attachment preview groups from projected metrics instead of raw tables', async () => {
    const selectedTables = [
      buildTable({ table: 'ORDERS' }),
      buildTable({ table: 'CUSTOMERS', rowCount: 25, byteSize: 2048, selected: true }),
    ];
    const previewGroups = buildSourceImportReviewPreviewGroups({
      tables: selectedTables,
      groupingStrategy: 'schema',
      copy: sourceImportWizardCopy.catalog,
      numberFormatter: sourceImportCatalogNumberFormatter,
    });

    await act(async () => {
      root.render(
        <SourceImportReviewView
          selectedTables={previewGroups.flatMap((group) => group.tables)}
          previewGroups={previewGroups}
          selectedCount={2}
          groupingStrategy="schema"
          selectedConnectionName="Local Postgres proof"
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

    expect(container.textContent).toContain('data-object-group: erp');
    expect(container.textContent).toContain('2 tables');
    expect(container.textContent).toContain('RAW.ERP.ORDERS');
    expect(container.textContent).toContain('1,500 rows');
    expect(container.textContent).toContain('3.9 MB');
    expect(container.textContent).toContain('2 columns');
    expect(
      container.querySelector('[data-source-import-review-table="RAW.ERP.ORDERS"]')?.textContent
    ).toContain('1,500 rows');
    expect(container.textContent).toContain('RAW.ERP.CUSTOMERS');
    expect(container.textContent).toContain('25 rows');
    expect(container.textContent).toContain('2 KB');
  });
});
