import { describe, expect, it } from 'vitest';

import { sourceImportWizardCopy } from './copy';
import { buildSourceImportReviewPreviewGroups } from './sourceImportReviewModel';
import type { TableInfo } from './types';

function buildTable(overrides?: Partial<TableInfo>): TableInfo {
  return {
    database: 'RAW',
    schema: 'ERP',
    table: 'ORDERS',
    selected: true,
    ...overrides,
  };
}

describe('sourceImportReviewModel', () => {
  it('projects selected source groups with table metrics for the attachment review', () => {
    const groups = buildSourceImportReviewPreviewGroups({
      tables: [
        buildTable({
          table: 'ORDERS',
          rowCount: 1500,
          byteSize: 4096000,
          columns: [
            { name: 'order_id', type: 'INTEGER', nullable: false },
            { name: 'customer_id', type: 'INTEGER', nullable: false },
          ],
        }),
        buildTable({
          table: 'CUSTOMERS',
          selected: false,
          rowCount: 10,
          columns: [{ name: 'customer_id', type: 'INTEGER', nullable: false }],
        }),
        buildTable({
          database: 'MART',
          schema: 'FINANCE',
          table: 'REVENUE',
          rowCount: 700,
          byteSize: 1024,
          selected: true,
          columns: [{ name: 'amount', type: 'NUMERIC', nullable: false }],
        }),
      ],
      groupingStrategy: 'database',
      copy: sourceImportWizardCopy.catalog,
      numberFormatter: new Intl.NumberFormat('en-US'),
    });

    expect(groups).toEqual([
      {
        key: 'MART',
        tableCountLabel: '1 table',
        tables: [
          expect.objectContaining({
            canonicalName: 'MART.FINANCE.REVENUE',
            rowCountLabel: '700 rows',
            byteSizeLabel: '1 KB',
            columnCountLabel: '1 column',
          }),
        ],
      },
      {
        key: 'RAW',
        tableCountLabel: '1 table',
        tables: [
          expect.objectContaining({
            canonicalName: 'RAW.ERP.ORDERS',
            rowCountLabel: '1,500 rows',
            byteSizeLabel: '3.9 MB',
            columnCountLabel: '2 columns',
          }),
        ],
      },
    ]);
  });
});
