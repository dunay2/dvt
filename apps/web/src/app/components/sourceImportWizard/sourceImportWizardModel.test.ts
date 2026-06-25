import { describe, expect, it } from 'vitest';

import type { TableInfo } from './types';
import {
  applySourceImportOptionDefaults,
  buildWarehouseTableKey,
  buildPreviewGroups,
  buildSourceImportOptionValues,
  canEnterSourceImportSection,
  canProceedForStep,
  getNextStep,
  getPreviousStep,
  getSelectedCount,
  getSelectedTables,
  groupTablesBySchema,
  resolveActiveTable,
  resolveSectionForStep,
  resolveStepForSection,
  buildSourceImportCatalogViewModel,
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

  it('groups tables by schema', () => {
    const grouped = groupTablesBySchema([
      buildTable({ schema: 'ERP' }),
      buildTable({ schema: 'MART', table: 'fct_sales' }),
    ]);
    expect(Object.keys(grouped)).toEqual(['ERP', 'MART']);
  });

  it('resolves canonical table keys and active table metadata targets', () => {
    const orders = buildTable({ selected: true, table: 'ORDERS' });
    const customers = buildTable({ table: 'CUSTOMERS' });

    expect(buildWarehouseTableKey(orders)).toBe('RAW.ERP.ORDERS');
    expect(getSelectedTables([orders, customers])).toEqual([orders]);
    expect(resolveActiveTable([orders, customers], 'RAW.ERP.CUSTOMERS')).toEqual(customers);
    expect(resolveActiveTable([orders, customers], null)).toEqual(orders);
  });

  it('builds preview groups from selected tables', () => {
    const groups = buildPreviewGroups(
      [
        buildTable({ selected: true, schema: 'ERP', table: 'ORDERS' }),
        buildTable({ selected: true, schema: 'ERP', table: 'CUSTOMERS' }),
        buildTable({ selected: false, schema: 'MART', table: 'fct_sales' }),
      ],
      'schema'
    );
    expect(groups.size).toBe(1);
    expect(groups.get('ERP')?.length).toBe(2);
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
    expect(canEnterSourceImportSection('selected', 'conn-1', 1)).toBe(true);
  });

  it('projects a professional source catalog view model for browse, metadata, and selected surfaces', () => {
    const viewModel = buildSourceImportCatalogViewModel({
      tables: [
        buildTable({
          schema: 'ERP',
          table: 'ORDERS',
          rowCount: 1500,
          selected: true,
          columns: [
            { name: 'order_id', type: 'INTEGER', nullable: false },
            { name: 'discount_code', type: 'TEXT', nullable: true },
          ],
        }),
        buildTable({
          schema: 'ERP',
          table: 'CUSTOMERS',
          rowCount: undefined,
          selected: false,
          columns: [{ name: 'customer_id', type: 'INTEGER', nullable: false }],
        }),
      ],
      activeTableKey: 'RAW.ERP.ORDERS',
    });

    expect(viewModel.schemaGroups).toEqual([
      expect.objectContaining({
        schema: 'ERP',
        tableCountLabel: '2 tables',
        selected: false,
        tables: [
          expect.objectContaining({
            canonicalName: 'RAW.ERP.ORDERS',
            displayName: 'ORDERS',
            accessibilityLabel: 'Select source table RAW.ERP.ORDERS. 1,500 rows. 2 columns.',
            rowCountLabel: '1,500 rows',
            columnCountLabel: '2 columns',
            columns: [
              { name: 'order_id', type: 'INTEGER', nullabilityLabel: 'Required' },
              { name: 'discount_code', type: 'TEXT', nullabilityLabel: 'Nullable' },
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
});
