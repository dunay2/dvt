import { describe, expect, it } from 'vitest';

import { buildSourceObjectIdentityKey } from './sourceImportCatalogModel';
import { buildSourceImportTestObject as buildTable } from './sourceImportWizard.testFixtures';
import {
  applySourceImportOptionDefaults,
  buildSourceImportRegistryPath,
  buildSourceImportOptionValues,
  canEnterSourceImportSection,
  canProceedForStep,
  getNextStep,
  getPreviousStep,
  getSelectedCount,
  getSelectedSourceObjects,
  resolveActiveSourceObject,
  resolveSectionForStep,
  resolveStepForSection,
  toggleSourceImportDatabaseSelection,
  toggleSourceImportSchemaSelection,
  matchRequestedDbtSourceTargets,
} from './sourceImportWizardModel';

describe('sourceImportWizardModel', () => {
  it('counts selected sourceObjects', () => {
    const sourceObjects = [buildTable({ selected: true }), buildTable({ table: 'CUSTOMERS' })];
    expect(getSelectedCount(sourceObjects)).toBe(1);
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

    expect(result.activeSourceObjectKey).toBe(
      buildSourceObjectIdentityKey(
        buildTable({ database: 'MART', schema: 'PUBLIC', table: 'CUSTOMERS' })
      )
    );
    expect(result.sourceObjects).toEqual([
      expect.objectContaining({
        locator: expect.objectContaining({ catalog: 'RAW', schema: 'PUBLIC' }),
        selected: false,
      }),
      expect.objectContaining({
        locator: expect.objectContaining({ catalog: 'MART', schema: 'PUBLIC' }),
        selected: true,
      }),
      expect.objectContaining({
        locator: expect.objectContaining({ catalog: 'MART', schema: 'FINANCE' }),
        selected: false,
      }),
    ]);
  });

  it('toggles all sourceObjects in the selected database without affecting another database', () => {
    const result = toggleSourceImportDatabaseSelection(
      [
        buildTable({ database: 'RAW', schema: 'ERP', table: 'ORDERS' }),
        buildTable({ database: 'RAW', schema: 'CRM', table: 'CUSTOMERS' }),
        buildTable({ database: 'MART', schema: 'ERP', table: 'ORDERS' }),
      ],
      { database: 'RAW' }
    );

    expect(result.activeSourceObjectKey).toBe(
      buildSourceObjectIdentityKey(buildTable({ database: 'RAW', schema: 'ERP', table: 'ORDERS' }))
    );
    expect(result.sourceObjects).toEqual([
      expect.objectContaining({
        locator: expect.objectContaining({ catalog: 'RAW', schema: 'ERP', name: 'ORDERS' }),
        selected: true,
      }),
      expect.objectContaining({
        locator: expect.objectContaining({ catalog: 'RAW', schema: 'CRM', name: 'CUSTOMERS' }),
        selected: true,
      }),
      expect.objectContaining({
        locator: expect.objectContaining({ catalog: 'MART', schema: 'ERP', name: 'ORDERS' }),
        selected: false,
      }),
    ]);

    const deselected = toggleSourceImportDatabaseSelection(result.sourceObjects, {
      database: 'RAW',
    });

    expect(deselected.sourceObjects).toEqual([
      expect.objectContaining({
        locator: expect.objectContaining({ catalog: 'RAW', schema: 'ERP', name: 'ORDERS' }),
        selected: false,
      }),
      expect.objectContaining({
        locator: expect.objectContaining({ catalog: 'RAW', schema: 'CRM', name: 'CUSTOMERS' }),
        selected: false,
      }),
      expect.objectContaining({
        locator: expect.objectContaining({ catalog: 'MART', schema: 'ERP', name: 'ORDERS' }),
        selected: false,
      }),
    ]);
  });

  it('resolves active table metadata targets', () => {
    const orders = buildTable({ selected: true, table: 'ORDERS' });
    const customers = buildTable({ table: 'CUSTOMERS' });

    expect(getSelectedSourceObjects([orders, customers])).toEqual([orders]);
    expect(
      resolveActiveSourceObject([orders, customers], buildSourceObjectIdentityKey(customers))
    ).toEqual(customers);
    expect(resolveActiveSourceObject([orders, customers], null)).toEqual(orders);
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

    expect(
      resolveActiveSourceObject([first, second], buildSourceObjectIdentityKey(second))
    ).toEqual(second);
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

  it('matches each imported dbt source table to one exact relational catalog object', () => {
    const match = matchRequestedDbtSourceTargets(
      [
        {
          uniqueId: 'source.analytics.raw.orders',
          filePath: 'models/sources.yml',
          sourceName: 'raw',
          tableName: 'orders',
          database: 'RAW',
          schema: 'ERP',
          identifier: 'ORDERS',
        },
        {
          uniqueId: 'source.analytics.raw.customers',
          filePath: 'models/sources.yml',
          sourceName: 'raw',
          tableName: 'customers',
          database: 'RAW',
          schema: 'ERP',
          identifier: 'CUSTOMERS',
        },
      ],
      [
        buildTable({ database: 'RAW', schema: 'ERP', table: 'ORDERS' }),
        buildTable({ database: 'RAW', schema: 'ERP', table: 'CUSTOMERS' }),
        buildTable({ database: 'RAW', schema: 'ERP', table: 'PAYMENTS' }),
      ]
    );

    expect(match.unmatchedSourceUniqueIds).toEqual([]);
    expect(match.objectIds).toEqual(['relation/RAW/ERP/CUSTOMERS', 'relation/RAW/ERP/ORDERS']);
    expect(match.targets).toEqual([
      {
        objectId: 'relation/RAW/ERP/CUSTOMERS',
        sourceUniqueId: 'source.analytics.raw.customers',
        filePath: 'models/sources.yml',
        sourceName: 'raw',
        tableName: 'customers',
      },
      {
        objectId: 'relation/RAW/ERP/ORDERS',
        sourceUniqueId: 'source.analytics.raw.orders',
        filePath: 'models/sources.yml',
        sourceName: 'raw',
        tableName: 'orders',
      },
    ]);
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
