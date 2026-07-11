import { describe, expect, it } from 'vitest';

import { sourceImportWizardCopy } from './copy';
import { buildSourceImportReviewPreviewGroups } from './sourceImportReviewModel';
import {
  buildSourceImportTestMetricEvidence,
  buildSourceImportTestObject,
} from './sourceImportWizard.testFixtures';
import type { SelectableRelationalSourceObject } from './types';

function buildTable(
  overrides?: Parameters<typeof buildSourceImportTestObject>[0]
): SelectableRelationalSourceObject {
  return buildSourceImportTestObject({
    selected: true,
    ...overrides,
  });
}

describe('sourceImportReviewModel', () => {
  it('projects selected source groups with registry paths and table metrics', () => {
    const groups = buildSourceImportReviewPreviewGroups({
      sourceObjects: [
        buildTable({
          table: 'ORDERS',
          columns: [
            { name: 'order_id', type: 'INTEGER', nullable: false },
            { name: 'customer_id', type: 'INTEGER', nullable: false },
          ],
        }),
        buildTable({
          table: 'CUSTOMERS',
          selected: false,
          metricEvidence: buildSourceImportTestMetricEvidence(10, 2048),
          columns: [{ name: 'customer_id', type: 'INTEGER', nullable: false }],
        }),
        buildTable({
          database: 'MART',
          schema: 'FINANCE',
          table: 'REVENUE',
          metricEvidence: buildSourceImportTestMetricEvidence(700, 1024),
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
        registryPath: 'models/sources/src_mart.yml',
        objectCountLabel: '1 object',
        sourceObjects: [
          expect.objectContaining({
            canonicalName: 'MART.FINANCE.REVENUE',
            rowCountLabel: '700 rows',
            byteSizeLabel: '1 KB',
            columnCountLabel: '1 column',
          }),
        ],
      },
      {
        registryPath: 'models/sources/src_raw.yml',
        objectCountLabel: '1 object',
        sourceObjects: [
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
