import { describe, expect, it } from 'vitest';

import {
  buildWarehouseTableKey,
  buildSourceImportCatalogViewModel,
  type SourceImportCatalogCopy,
} from './sourceImportCatalogModel';
import { sourceImportWizardCopy } from './copy';
import type { TableInfo } from './types';

function buildTable(overrides?: Partial<TableInfo>): TableInfo {
  return {
    database: 'RAW',
    schema: 'ERP',
    table: 'ORDERS',
    selected: false,
    ...overrides,
  };
}

describe('sourceImportCatalogModel', () => {
  const catalogCopy = sourceImportWizardCopy.catalog;
  const numberFormatter = new Intl.NumberFormat('en-US');

  it('resolves canonical warehouse table keys', () => {
    expect(buildWarehouseTableKey(buildTable({ table: 'ORDERS' }))).toBe('RAW.ERP.ORDERS');
  });

  it('projects a professional source catalog view model for browse, metadata, and selected surfaces', () => {
    const viewModel = buildSourceImportCatalogViewModel({
      tables: [
        buildTable({
          database: 'RAW',
          schema: 'ERP',
          table: 'ORDERS',
          rowCount: 1500,
          byteSize: 4096000,
          selected: true,
          columns: [
            { name: 'order_id', type: 'INTEGER', nullable: false, primaryKey: true, unique: true },
            { name: 'discount_code', type: 'TEXT', nullable: true },
          ],
        }),
        buildTable({
          database: 'RAW',
          schema: 'ERP',
          table: 'CUSTOMERS',
          rowCount: undefined,
          selected: false,
          columns: [{ name: 'customer_id', type: 'INTEGER', nullable: false }],
        }),
      ],
      activeTableKey: 'RAW.ERP.ORDERS',
      copy: catalogCopy,
      numberFormatter,
    });

    expect(viewModel.databaseGroups).toEqual([
      expect.objectContaining({
        database: 'RAW',
        schemaCountLabel: '1 schema',
        tableCountLabel: '2 tables',
        selected: false,
        schemaGroups: [
          expect.objectContaining({
            schema: 'ERP',
            tableCountLabel: '2 tables',
          }),
        ],
      }),
    ]);
    expect(viewModel.schemaGroups).toEqual([
      expect.objectContaining({
        schema: 'ERP',
        tableCountLabel: '2 tables',
        selected: false,
        tables: [
          expect.objectContaining({
            canonicalName: 'RAW.ERP.ORDERS',
            displayName: 'ORDERS',
            accessibilityLabel:
              'Select source table RAW.ERP.ORDERS. 1,500 rows. 3.9 MB. 2 columns.',
            rowCountLabel: '1,500 rows',
            byteSizeLabel: '3.9 MB',
            columnCountLabel: '2 columns',
            columns: [
              {
                name: 'order_id',
                type: 'INTEGER',
                nullabilityLabel: 'Required',
                constraintLabels: ['Primary key', 'Unique', 'Required'],
              },
              {
                name: 'discount_code',
                type: 'TEXT',
                nullabilityLabel: 'Nullable',
                constraintLabels: ['Nullable'],
              },
            ],
          }),
          expect.objectContaining({
            canonicalName: 'RAW.ERP.CUSTOMERS',
            accessibilityLabel: 'Select source table RAW.ERP.CUSTOMERS. Rows unknown. 1 column.',
            rowCountLabel: 'Rows unknown',
            columnCountLabel: '1 column',
          }),
        ],
      }),
    ]);
    expect(viewModel.activeTable).toEqual(
      expect.objectContaining({
        canonicalName: 'RAW.ERP.ORDERS',
        rowCountLabel: '1,500 rows',
        byteSizeLabel: '3.9 MB',
        columnCountLabel: '2 columns',
      })
    );
    expect(viewModel.selectedTables).toEqual([
      expect.objectContaining({
        canonicalName: 'RAW.ERP.ORDERS',
        columnCountLabel: '2 columns',
      }),
    ]);
  });

  it('filters the source catalog by schema, table, column, and type without losing selected totals', () => {
    const viewModel = buildSourceImportCatalogViewModel({
      tables: [
        buildTable({
          schema: 'ERP',
          table: 'ORDERS',
          selected: true,
          columns: [
            { name: 'order_id', type: 'INTEGER', nullable: false },
            { name: 'customer_id', type: 'INTEGER', nullable: false },
          ],
        }),
        buildTable({
          schema: 'CRM',
          table: 'CUSTOMERS',
          selected: true,
          columns: [
            { name: 'customer_id', type: 'INTEGER', nullable: false },
            { name: 'email', type: 'VARCHAR', nullable: true },
          ],
        }),
        buildTable({
          schema: 'OPS',
          table: 'SHIPMENTS',
          selected: false,
          columns: [{ name: 'tracking_code', type: 'TEXT', nullable: false }],
        }),
      ],
      activeTableKey: 'RAW.ERP.ORDERS',
      searchQuery: 'email',
      copy: catalogCopy,
      numberFormatter,
    });

    expect(viewModel.totalTableCount).toBe(3);
    expect(viewModel.visibleTableCount).toBe(1);
    expect(viewModel.selectedTableCount).toBe(2);
    expect(viewModel.resultCountLabel).toBe('Showing 1 of 3 tables');
    expect(viewModel.schemaGroups).toEqual([
      expect.objectContaining({
        schema: 'CRM',
        tableCountLabel: '1 table',
        tables: [
          expect.objectContaining({
            canonicalName: 'RAW.CRM.CUSTOMERS',
          }),
        ],
      }),
    ]);
    expect(viewModel.activeTable).toEqual(
      expect.objectContaining({
        canonicalName: 'RAW.CRM.CUSTOMERS',
      })
    );
  });

  it('groups visible source catalog entries by database and schema for categorized browsing', () => {
    const viewModel = buildSourceImportCatalogViewModel({
      tables: [
        buildTable({ database: 'RAW', schema: 'ERP', table: 'ORDERS', selected: true }),
        buildTable({ database: 'RAW', schema: 'CRM', table: 'CUSTOMERS', selected: false }),
        buildTable({ database: 'MART', schema: 'FINANCE', table: 'REVENUE', selected: true }),
      ],
      activeTableKey: null,
      copy: catalogCopy,
      numberFormatter,
    });

    expect(viewModel.databaseGroups).toEqual([
      expect.objectContaining({
        database: 'MART',
        schemaCountLabel: '1 schema',
        tableCountLabel: '1 table',
        selected: true,
        schemaGroups: [
          expect.objectContaining({
            schema: 'FINANCE',
            tableCountLabel: '1 table',
            selected: true,
            tables: [expect.objectContaining({ canonicalName: 'MART.FINANCE.REVENUE' })],
          }),
        ],
      }),
      expect.objectContaining({
        database: 'RAW',
        schemaCountLabel: '2 schemas',
        tableCountLabel: '2 tables',
        selected: false,
        schemaGroups: [
          expect.objectContaining({
            schema: 'CRM',
            tables: [expect.objectContaining({ canonicalName: 'RAW.CRM.CUSTOMERS' })],
          }),
          expect.objectContaining({
            schema: 'ERP',
            tables: [expect.objectContaining({ canonicalName: 'RAW.ERP.ORDERS' })],
          }),
        ],
      }),
    ]);
  });

  it('projects labels and number formatting from injected catalog copy instead of model literals', () => {
    const localizedCopy: SourceImportCatalogCopy = {
      selectSourceTable: 'Seleccionar tabla origen',
      selectSourceDatabase: 'Seleccionar base origen',
      inspectSourceTableMetadata: 'Inspeccionar tabla origen',
      metadata: 'metadata',
      rowsUnknown: 'Filas desconocidas',
      rowSingular: 'fila',
      rowPlural: 'filas',
      columnSingular: 'columna',
      columnPlural: 'columnas',
      tableSingular: 'tabla',
      tablePlural: 'tablas',
      schemaSingular: 'esquema',
      schemaPlural: 'esquemas',
      allSelected: 'Todo seleccionado',
      nullable: 'Nullable',
      required: 'Obligatoria',
      primaryKey: 'Clave primaria',
      unique: 'Unica',
      available: 'disponibles',
      showing: 'Mostrando',
      of: 'de',
    };

    const viewModel = buildSourceImportCatalogViewModel({
      tables: [
        buildTable({
          table: 'ORDERS',
          rowCount: 1500,
          selected: false,
          columns: [{ name: 'order_id', type: 'INTEGER', nullable: false, primaryKey: true }],
        }),
        buildTable({
          table: 'CUSTOMERS',
          selected: false,
          columns: [{ name: 'email', type: 'TEXT', nullable: true }],
        }),
      ],
      activeTableKey: null,
      searchQuery: 'email',
      copy: localizedCopy,
      numberFormatter: new Intl.NumberFormat('es-ES'),
    });

    expect(viewModel.totalTableCount).toBe(2);
    expect(viewModel.visibleTableCount).toBe(1);
    expect(viewModel.resultCountLabel).toBe('Mostrando 1 de 2 tablas');
    expect(viewModel.databaseGroups[0]?.schemaCountLabel).toBe('1 esquema');
    expect(viewModel.databaseGroups[0]?.tableCountLabel).toBe('1 tabla');
    expect(viewModel.activeTable).toEqual(
      expect.objectContaining({
        canonicalName: 'RAW.ERP.CUSTOMERS',
        accessibilityLabel:
          'Seleccionar tabla origen RAW.ERP.CUSTOMERS. Filas desconocidas. 1 columna.',
        inspectionAccessibilityLabel:
          'Inspeccionar tabla origen RAW.ERP.CUSTOMERS metadata. Filas desconocidas. 1 columna.',
      })
    );
  });
});
