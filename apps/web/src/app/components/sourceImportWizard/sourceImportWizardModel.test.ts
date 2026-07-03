import { describe, expect, it } from 'vitest';

import type { TableInfo } from './types';
import {
  applySourceImportOptionDefaults,
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

  it('groups tables by schema', () => {
    const grouped = groupTablesBySchema([
      buildTable({ schema: 'ERP' }),
      buildTable({ schema: 'MART', table: 'fct_sales' }),
    ]);
    expect(Object.keys(grouped)).toEqual(['ERP', 'MART']);
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

    expect(result.activeTableKey).toBe('MART.PUBLIC.CUSTOMERS');
    expect(result.tables).toEqual([
      expect.objectContaining({ database: 'RAW', schema: 'PUBLIC', selected: false }),
      expect.objectContaining({ database: 'MART', schema: 'PUBLIC', selected: true }),
      expect.objectContaining({ database: 'MART', schema: 'FINANCE', selected: false }),
    ]);
  });

  it('resolves active table metadata targets', () => {
    const orders = buildTable({ selected: true, table: 'ORDERS' });
    const customers = buildTable({ table: 'CUSTOMERS' });

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
    expect(canEnterSourceImportSection('metadata', 'conn-1', 0, true)).toBe(true);
    expect(canEnterSourceImportSection('selected', 'conn-1', 1)).toBe(true);
  });
});
