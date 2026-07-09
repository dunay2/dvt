import { describe, expect, it } from 'vitest';

import type { TableInfo } from './types';
import { buildWarehouseTableIdentityKey } from './sourceImportCatalogModel';
import {
  applySourceImportOptionDefaults,
  buildSourceImportRegistryPath,
  buildSourceImportOptionValues,
  canEnterSourceImportSection,
  canProceedForStep,
  getNextStep,
  getPreviousStep,
  getSelectedCount,
  getSelectedTables,
  resolveActiveTable,
  resolveSectionForStep,
  resolveStepForSection,
  toggleSourceImportDatabaseSelection,
  toggleSourceImportSchemaSelection,
} from './sourceImportWizardModel';

function buildTable(overrides?: Partial<TableInfo>): TableInfo {
  return {
    database: 'RAW',
    schema: 'ERP',
    table: 'ORDERS',
    selected: false,
    ...overrides,
  };
}

describe('sourceImportWizardModel', () => {
  it('counts selected tables', () => {
    const tables = [buildTable({ selected: true }), buildTable({ table: 'CUSTOMERS' })];
    expect(getSelectedCount(tables)).toBe(1);
  });

  it('toggles only the selected database and schema scope when schema names repeat', () => {
    const result = toggleSourceImportSchemaSelection(
      [
        buildTable({ database: 'RAW', schema: 'PUBLIC', table: 'ORDERS' }),
        buildTable({ database: 'MART', schema: 'PUBLIC', table: 'CUSTOMERS' }),
        buildTable({ database: 'MART', schema: 'FINANCE', table: 'REVENUE' }),
      ],
      { database: 'MART', schema: 'PUBLIC' }
    );

    expect(result.activeTableKey).toBe(
      buildWarehouseTableIdentityKey({
        database: 'MART',
        schema: 'PUBLIC',
        table: 'CUSTOMERS',
      })
    );
    expect(result.tables).toEqual([
      expect.objectContaining({ database: 'RAW', schema: 'PUBLIC', selected: false }),
      expect.objectContaining({ database: 'MART', schema: 'PUBLIC', selected: true }),
      expect.objectContaining({ database: 'MART', schema: 'FINANCE', selected: false }),
    ]);
  });

  it('toggles all tables in the selected database without affecting another database', () => {
    const result = toggleSourceImportDatabaseSelection(
      [
        buildTable({ database: 'RAW', schema: 'ERP', table: 'ORDERS' }),
        buildTable({ database: 'RAW', schema: 'CRM', table: 'CUSTOMERS' }),
        buildTable({ database: 'MART', schema: 'ERP', table: 'ORDERS' }),
      ],
      { database: 'RAW' }
    );

    expect(result.activeTableKey).toBe(
      buildWarehouseTableIdentityKey({
        database: 'RAW',
        schema: 'ERP',
        table: 'ORDERS',
      })
    );
    expect(result.tables).toEqual([
      expect.objectContaining({ database: 'RAW', schema: 'ERP', table: 'ORDERS', selected: true }),
      expect.objectContaining({
        database: 'RAW',
        schema: 'CRM',
        table: 'CUSTOMERS',
        selected: true,
      }),
      expect.objectContaining({
        database: 'MART',
        schema: 'ERP',
        table: 'ORDERS',
        selected: false,
      }),
    ]);

    const deselected = toggleSourceImportDatabaseSelection(result.tables, { database: 'RAW' });

    expect(deselected.tables).toEqual([
      expect.objectContaining({
        database: 'RAW',
        schema: 'ERP',
        table: 'ORDERS',
        selected: false,
      }),
      expect.objectContaining({
        database: 'RAW',
        schema: 'CRM',
        table: 'CUSTOMERS',
        selected: false,
      }),
      expect.objectContaining({
        database: 'MART',
        schema: 'ERP',
        table: 'ORDERS',
        selected: false,
      }),
    ]);
  });

  it('resolves active table metadata targets', () => {
    const orders = buildTable({ selected: true, table: 'ORDERS' });
    const customers = buildTable({ table: 'CUSTOMERS' });

    expect(getSelectedTables([orders, customers])).toEqual([orders]);
    expect(
      resolveActiveTable([orders, customers], buildWarehouseTableIdentityKey(customers))
    ).toEqual(customers);
    expect(resolveActiveTable([orders, customers], null)).toEqual(orders);
  });

  it('resolves active table metadata by structured table identity', () => {
    const first = buildTable({
      database: 'RAW.PROD',
      schema: 'PUBLIC',
      table: 'ORDERS',
      selected: false,
    });
    const second = buildTable({
      database: 'RAW',
      schema: 'PROD.PUBLIC',
      table: 'ORDERS',
      selected: false,
    });

    expect(resolveActiveTable([first, second], buildWarehouseTableIdentityKey(second))).toEqual(
      second
    );
  });

  it('resolves governed source registry paths with the same grouping posture as import', () => {
    expect(
      buildSourceImportRegistryPath(
        buildTable({ database: 'RAW', schema: 'ERP', table: 'ORDERS' }),
        'schema'
      )
    ).toBe('models/sources/src_erp.yml');

    expect(
      buildSourceImportRegistryPath(
        buildTable({ database: 'RAW', schema: 'ERP', table: 'ORDERS' }),
        'database'
      )
    ).toBe('models/sources/src_raw.yml');
  });

  it('rejects unsupported grouping strategies instead of aliasing them to schema grouping', () => {
    expect(() =>
      buildSourceImportRegistryPath(
        buildTable({ database: 'RAW', schema: 'ERP', table: 'ORDERS' }),
        'custom'
      )
    ).toThrow('Unsupported source import grouping strategy: custom');
  });

  it('normalizes governed source registry paths from warehouse identifiers', () => {
    const table = buildTable({
      database: 'Raw Lake',
      schema: 'Sales/ERP Ops',
      table: 'Orders',
    });

    expect(buildSourceImportRegistryPath(table, 'schema')).toBe(
      'models/sources/src_sales_erp_ops.yml'
    );
    expect(buildSourceImportRegistryPath(table, 'database')).toBe(
      'models/sources/src_raw_lake.yml'
    );
  });

  it('applies plugin-declared source import option defaults through the model', () => {
    const state = applySourceImportOptionDefaults(
      {
        includeColumns: false,
        addTests: false,
        addFreshness: false,
      },
      [
        {
          id: 'includeColumns',
          label: 'Include Column Metadata',
          description: 'Column metadata',
          defaultEnabled: true,
          order: 10,
        },
        {
          id: 'addFreshness',
          label: 'Freshness',
          description: 'Freshness policy',
          defaultEnabled: true,
          order: 20,
        },
      ]
    );

    expect(buildSourceImportOptionValues(state)).toEqual({
      includeColumns: true,
      addTests: false,
      addFreshness: true,
    });
  });

  it('applies canProceed gating rules by step', () => {
    expect(canProceedForStep('connection', null, 0)).toBe(false);
    expect(canProceedForStep('connection', 'conn-1', 0)).toBe(true);
    expect(canProceedForStep('selection', 'conn-1', 0)).toBe(false);
    expect(canProceedForStep('selection', 'conn-1', 1)).toBe(true);
  });

  it('navigates wizard steps in both directions', () => {
    expect(getNextStep('connection')).toBe('selection');
    expect(getPreviousStep('connection')).toBe('connection');
    expect(getPreviousStep('selection')).toBe('connection');
  });

  it('maps contextual source-import sections to guarded workflow steps', () => {
    expect(resolveSectionForStep('connection')).toBe('connections');
    expect(resolveSectionForStep('selection')).toBe('browse');
    expect(resolveSectionForStep('options')).toBe('metadata');
    expect(resolveSectionForStep('review')).toBe('selected');
    expect(resolveStepForSection('metadata')).toBe('options');
    expect(canEnterSourceImportSection('connections', null, 0)).toBe(true);
    expect(canEnterSourceImportSection('browse', null, 0)).toBe(false);
    expect(canEnterSourceImportSection('browse', 'conn-1', 0)).toBe(true);
    expect(canEnterSourceImportSection('metadata', 'conn-1', 0)).toBe(false);
    expect(canEnterSourceImportSection('metadata', 'conn-1', 0, true)).toBe(true);
    expect(canEnterSourceImportSection('selected', 'conn-1', 1)).toBe(true);
  });
});
