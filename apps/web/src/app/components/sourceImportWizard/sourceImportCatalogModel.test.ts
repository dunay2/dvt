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
    expect(viewModel.selectedTables).toEqual([
      expect.objectContaining({ canonicalName: 'RAW.ERP.ORDERS' }),
      expect.objectContaining({ canonicalName: 'RAW.CRM.CUSTOMERS' }),
    ]);
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

  it('filters the source catalog by governed metadata category without changing selection totals', () => {
    const viewModel = buildSourceImportCatalogViewModel({
      tables: [
        buildTable({
          table: 'ORDERS',
          selected: true,
          rowCount: 1500,
          byteSize: 4096000,
          columns: [{ name: 'order_id', type: 'INTEGER', nullable: false }],
        }),
        buildTable({
          table: 'CUSTOMERS',
          selected: false,
          rowCount: undefined,
          columns: [{ name: 'customer_id', type: 'INTEGER', nullable: false }],
        }),
        buildTable({
          table: 'SHIPMENTS',
          selected: false,
          rowCount: undefined,
          columns: [],
        }),
      ],
      activeTableKey: null,
      filterId: 'withColumns',
      copy: catalogCopy,
      numberFormatter,
    });

    expect(viewModel.totalTableCount).toBe(3);
    expect(viewModel.visibleTableCount).toBe(2);
    expect(viewModel.selectedTableCount).toBe(1);
    expect(viewModel.categoryFilters).toEqual([
      expect.objectContaining({ id: 'all', label: 'All', countLabel: '3', active: false }),
      expect.objectContaining({
        id: 'selected',
        label: 'Selected',
        countLabel: '1',
        active: false,
      }),
      expect.objectContaining({
        id: 'withColumns',
        label: 'With columns',
        countLabel: '2',
        active: true,
      }),
      expect.objectContaining({
        id: 'withSize',
        label: 'With size',
        countLabel: '1',
        active: false,
      }),
    ]);
    expect(viewModel.databaseGroups[0]?.schemaGroups[0]?.tables).toEqual([
      expect.objectContaining({ canonicalName: 'RAW.ERP.ORDERS' }),
      expect.objectContaining({ canonicalName: 'RAW.ERP.CUSTOMERS' }),
    ]);
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

  it('keeps same-named schemas scoped by database for accessible categorized browsing', () => {
    const viewModel = buildSourceImportCatalogViewModel({
      tables: [
        buildTable({ database: 'RAW', schema: 'PUBLIC', table: 'ORDERS', selected: false }),
        buildTable({ database: 'MART', schema: 'PUBLIC', table: 'ORDERS', selected: false }),
      ],
      activeTableKey: null,
      copy: catalogCopy,
      numberFormatter,
    });

    expect(viewModel.schemaGroups).toEqual([
      expect.objectContaining({
        schema: 'PUBLIC',
        accessibilityLabel: 'Select source schema PUBLIC. Select source database MART. 1 table.',
        tables: [expect.objectContaining({ canonicalName: 'MART.PUBLIC.ORDERS' })],
      }),
      expect.objectContaining({
        schema: 'PUBLIC',
        accessibilityLabel: 'Select source schema PUBLIC. Select source database RAW. 1 table.',
        tables: [expect.objectContaining({ canonicalName: 'RAW.PUBLIC.ORDERS' })],
      }),
    ]);
  });

  it('does not merge schema groups when database and schema names contain dots', () => {
    const viewModel = buildSourceImportCatalogViewModel({
      tables: [
        buildTable({
          database: 'RAW.PROD',
          schema: 'PUBLIC',
          table: 'ORDERS',
          selected: false,
        }),
        buildTable({
          database: 'RAW',
          schema: 'PROD.PUBLIC',
          table: 'CUSTOMERS',
          selected: false,
        }),
      ],
      activeTableKey: null,
      copy: catalogCopy,
      numberFormatter,
    });

    expect(viewModel.schemaGroups).toEqual([
      expect.objectContaining({
        schema: 'PROD.PUBLIC',
        accessibilityLabel:
          'Select source schema PROD.PUBLIC. Select source database RAW. 1 table.',
        tables: [expect.objectContaining({ canonicalName: 'RAW.PROD.PUBLIC.CUSTOMERS' })],
      }),
      expect.objectContaining({
        schema: 'PUBLIC',
        accessibilityLabel:
          'Select source schema PUBLIC. Select source database RAW.PROD. 1 table.',
        tables: [expect.objectContaining({ canonicalName: 'RAW.PROD.PUBLIC.ORDERS' })],
      }),
    ]);
  });

  it('projects labels and number formatting from injected catalog copy instead of model literals', () => {
    const localizedCopy: SourceImportCatalogCopy = {
      selectSourceTable: 'Seleccionar tabla origen',
      selectSourceDatabase: 'Seleccionar base origen',
      selectSourceSchema: 'Seleccionar esquema origen',
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
      filterAll: 'Todas',
      filterSelected: 'Seleccionadas',
      filterWithColumns: 'Con columnas',
      filterWithSize: 'Con tamano',
      filterListLabel: 'Filtros del catalogo origen',
      filterAccessibilityPrefix: 'Filtrar catalogo origen por',
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
