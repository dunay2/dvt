import { describe, expect, it } from 'vitest';

import {
  buildRelationalSourceObjectName,
  buildSourceImportCatalogViewModel,
  buildSourceObjectIdentityKey,
} from './sourceImportCatalogModel';
import { resolveSourceImportWizardCopy, sourceImportWizardCopy } from './copy';
import {
  buildSourceImportTestMetricEvidence,
  buildSourceImportTestObject as buildRelation,
} from './sourceImportWizard.testFixtures';

describe('sourceImportCatalogModel relational catalog', () => {
  const copy = sourceImportWizardCopy.catalog;
  const numberFormatter = new Intl.NumberFormat('en-US');

  it('uses opaque object ids for identity while presenting the relational path', () => {
    const first = buildRelation({
      database: 'RAW.PROD',
      schema: 'PUBLIC',
      table: 'ORDERS',
    });
    const second = buildRelation({
      database: 'RAW',
      schema: 'PROD.PUBLIC',
      table: 'ORDERS',
    });

    expect(buildRelationalSourceObjectName(first)).toBe('RAW.PROD.PUBLIC.ORDERS');
    expect(buildRelationalSourceObjectName(second)).toBe('RAW.PROD.PUBLIC.ORDERS');
    expect(buildSourceObjectIdentityKey(first)).not.toBe(buildSourceObjectIdentityKey(second));

    const catalog = buildSourceImportCatalogViewModel({
      sourceObjects: [first, second],
      activeSourceObjectKey: second.objectId,
      copy,
      numberFormatter,
    });

    expect(catalog.activeSourceObject).toEqual(
      expect.objectContaining({
        identityKey: second.objectId,
        canonicalName: 'RAW.PROD.PUBLIC.ORDERS',
      })
    );
  });

  it('projects governed metrics, constraints, and selection without duplicating raw contracts', () => {
    const relation = buildRelation({
      selected: true,
      columns: [
        { name: 'order_id', type: 'INTEGER', nullable: false },
        { name: 'external_id', type: 'TEXT', nullable: false },
        { name: 'discount_code', type: 'TEXT', nullable: true },
      ],
      constraints: [
        { name: 'orders_pkey', kind: 'primary-key', columns: ['order_id'] },
        { name: 'orders_external_id_key', kind: 'unique', columns: ['external_id'] },
      ],
    });

    const catalog = buildSourceImportCatalogViewModel({
      sourceObjects: [relation],
      activeSourceObjectKey: relation.objectId,
      copy,
      numberFormatter,
    });

    expect(catalog.activeSourceObject).toEqual(
      expect.objectContaining({
        canonicalName: 'RAW.ERP.ORDERS',
        rowCountLabel: '1,500 rows',
        rowCountTone: 'estimated',
        byteSizeLabel: '3.9 MB',
        byteSizeTone: 'measured',
        columnCountLabel: '3 columns',
        selected: true,
        selectable: true,
        importabilityLabel: null,
        columns: [
          expect.objectContaining({
            name: 'order_id',
            constraintMarkers: [{ kind: 'primary-key', shortLabel: 'PK', label: 'Primary key' }],
          }),
          expect.objectContaining({
            name: 'external_id',
            constraintMarkers: [
              { kind: 'unique', shortLabel: 'UQ', label: 'Unique' },
              { kind: 'not-null', shortLabel: 'NN', label: 'Not null' },
            ],
          }),
          expect.objectContaining({
            name: 'discount_code',
            constraintMarkers: [],
          }),
        ],
      })
    );
    expect(catalog.selectedSourceObjects).toHaveLength(1);
  });

  it('marks calculated bytes as estimated and preserves their evidence detail', () => {
    const relation = buildRelation({
      metricEvidence: buildSourceImportTestMetricEvidence(128, 8704, 'estimated'),
    });

    const catalog = buildSourceImportCatalogViewModel({
      sourceObjects: [relation],
      activeSourceObjectKey: relation.objectId,
      copy,
      numberFormatter,
    });

    expect(catalog.activeSourceObject).toEqual(
      expect.objectContaining({
        rowCountLabel: '128 rows',
        byteSizeLabel: 'Estimated 8.5 KB',
        byteSizeTone: 'estimated',
      })
    );
    expect(catalog.activeSourceObject?.byteSizeDetail).toContain('Estimated using schema width');
  });

  it('formats compact byte evidence with the active Spanish locale', () => {
    const spanishNumberFormatter = new Intl.NumberFormat('es-ES');
    const relation = buildRelation({
      metricEvidence: buildSourceImportTestMetricEvidence(128, 1536),
    });

    const catalog = buildSourceImportCatalogViewModel({
      sourceObjects: [relation],
      activeSourceObjectKey: relation.objectId,
      copy: resolveSourceImportWizardCopy('es').catalog,
      numberFormatter: spanishNumberFormatter,
    });

    expect(catalog.activeSourceObject).toEqual(
      expect.objectContaining({
        byteSizeLabel: '1,5 KB',
        byteSizeDetail: expect.stringContaining('1536 B (1,5 KB)'),
      })
    );
  });

  it('groups relations by database and schema without merging dotted identities', () => {
    const catalog = buildSourceImportCatalogViewModel({
      sourceObjects: [
        buildRelation({ database: 'RAW.PROD', schema: 'PUBLIC', table: 'ORDERS' }),
        buildRelation({ database: 'RAW', schema: 'PROD.PUBLIC', table: 'CUSTOMERS' }),
        buildRelation({ database: 'MART', schema: 'FINANCE', table: 'REVENUE' }),
      ],
      activeSourceObjectKey: null,
      copy,
      numberFormatter,
    });

    expect(catalog.databaseGroups.map((group) => group.database)).toEqual([
      'MART',
      'RAW',
      'RAW.PROD',
    ]);
    expect(catalog.schemaGroups).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          schema: 'PROD.PUBLIC',
          sourceObjects: [expect.objectContaining({ canonicalName: 'RAW.PROD.PUBLIC.CUSTOMERS' })],
        }),
        expect.objectContaining({
          schema: 'PUBLIC',
          sourceObjects: [expect.objectContaining({ canonicalName: 'RAW.PROD.PUBLIC.ORDERS' })],
        }),
      ])
    );
  });

  it('searches relational locator and column metadata while preserving selected totals', () => {
    const catalog = buildSourceImportCatalogViewModel({
      sourceObjects: [
        buildRelation({
          table: 'ORDERS',
          selected: true,
          columns: [{ name: 'order_id', type: 'INTEGER', nullable: false }],
        }),
        buildRelation({
          schema: 'CRM',
          table: 'CUSTOMERS',
          selected: true,
          columns: [{ name: 'email', type: 'VARCHAR', nullable: true }],
        }),
        buildRelation({ table: 'SHIPMENTS' }),
      ],
      activeSourceObjectKey: null,
      searchQuery: 'email',
      copy,
      numberFormatter,
    });

    expect(catalog.totalObjectCount).toBe(3);
    expect(catalog.visibleObjectCount).toBe(1);
    expect(catalog.selectedObjectCount).toBe(2);
    expect(catalog.resultCountLabel).toBe('Showing 1 of 3 objects');
    expect(catalog.activeSourceObject?.canonicalName).toBe('RAW.CRM.CUSTOMERS');
  });

  it('filters by metadata category without changing the governed selection', () => {
    const catalog = buildSourceImportCatalogViewModel({
      sourceObjects: [
        buildRelation({
          table: 'ORDERS',
          selected: true,
          columns: [{ name: 'order_id', type: 'INTEGER', nullable: false }],
        }),
        buildRelation({ table: 'CUSTOMERS', columns: [] }),
      ],
      activeSourceObjectKey: null,
      filterId: 'withColumns',
      copy,
      numberFormatter,
    });

    expect(catalog.visibleObjectCount).toBe(1);
    expect(catalog.selectedObjectCount).toBe(1);
    expect(catalog.categoryFilters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'all', countLabel: '2', active: false }),
        expect.objectContaining({ id: 'withColumns', countLabel: '1', active: true }),
        expect.objectContaining({ id: 'importable', countLabel: '2', active: false }),
      ])
    );
  });
});
