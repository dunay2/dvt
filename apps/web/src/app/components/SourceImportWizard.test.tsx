// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildWarehouseSourceImportPort,
  createSourceImportWizardHarness,
} from './SourceImportWizard.testHarness';
import type { ImportSourcesInput } from '../ports/workspace';

describe('SourceImportWizard', () => {
  let harness: ReturnType<typeof createSourceImportWizardHarness>;

  beforeEach(() => {
    harness = createSourceImportWizardHarness();
  });

  afterEach(() => {
    harness.cleanup();
  });

  it('opens on governed database connections without unavailable source-type placeholders', async () => {
    const onClose = vi.fn();

    await harness.renderWizard({ onClose });

    expect(document.body.textContent).toContain('Add source');
    expect(document.body.textContent).toContain('Connections');
    expect(document.body.textContent).toContain('Browse');
    expect(document.body.textContent).toContain('Metadata');
    expect(document.body.textContent).toContain('Selected');
    expect(document.body.textContent).not.toContain('DataObject Registry');
    expect(document.body.textContent).toContain('Choose database connection');
    expect(document.body.textContent).toContain('Snowflake PROD');
    expect(document.body.textContent).not.toContain('File');
    expect(document.body.textContent).not.toContain('API');
    expect(document.body.textContent).not.toContain('Stream');
    expect(document.body.textContent).not.toContain('not available yet');
    expect(document.body.textContent).not.toContain('Only Database is available');
    expect(harness.findButtonContaining('Back')).toBeUndefined();
    expect(harness.findNextButton()).toBeUndefined();
    expect(harness.findTab('Browse')?.disabled).toBe(true);
    expect(harness.findTab('Metadata')?.disabled).toBe(true);
    expect(harness.findTab('Selected')?.disabled).toBe(true);
    const connectionOption = harness.findConnectionOption('Snowflake PROD');

    expect(connectionOption).toBeDefined();
    expect(connectionOption?.tagName).toBe('BUTTON');

    await harness.clickConnectionOption('Snowflake PROD');
    await harness.clickTab('Browse');

    expect(document.body.textContent).toContain('Browse source tables');
    expect(document.body.textContent).toContain('ORDERS');
  });

  it('tests the selected warehouse connection before browsing source tables', async () => {
    const testWarehouseConnection = vi.fn(async (connectionId: string) => ({
      connectionId,
      status: 'passed' as const,
      checkedAt: '2026-06-08T00:00:00.000Z',
      tableCount: 12,
    }));

    await harness.renderWizard({
      warehouseSourceImport: buildWarehouseSourceImportPort({ testWarehouseConnection }),
    });

    await harness.clickConnectionOption('Snowflake PROD');
    await harness.clickButtonContaining('Test connection');
    await harness.flushPendingWork();

    expect(testWarehouseConnection).toHaveBeenCalledWith('conn-1');
    expect(document.body.textContent).toContain('Connection passed');
    expect(document.body.textContent).toContain('12 tables reachable');
  });

  it('creates a governed warehouse connection before browsing source tables', async () => {
    const createWarehouseConnection = vi.fn(async () => ({
      id: 'local-postgres-proof',
      name: 'Local Postgres proof',
      type: 'postgres' as const,
      database: 'dvt',
    }));
    const listWarehouseTables = vi.fn(async () => [
      {
        database: 'dvt',
        schema: 'public',
        table: 'orders',
        rowCount: 42,
      },
    ]);

    await harness.renderWizard({
      warehouseSourceImport: buildWarehouseSourceImportPort({
        listWarehouseConnections: async () => [],
        createWarehouseConnection,
        listWarehouseTables,
      }),
    });

    await harness.clickButtonContaining('New connection');
    await harness.fillInputByLabel('Connection name', 'Local Postgres proof');
    await harness.selectByLabel('Connection type', 'postgres');
    await harness.fillInputByLabel('Database', 'dvt');
    await harness.fillInputByLabel('Credential reference', 'env:DVT_LOCAL_POSTGRES_URL');
    await harness.clickButtonContaining('Create connection');
    await harness.flushPendingWork();

    expect(createWarehouseConnection).toHaveBeenCalledWith({
      name: 'Local Postgres proof',
      type: 'postgres',
      database: 'dvt',
      credentialRef: 'env:DVT_LOCAL_POSTGRES_URL',
    });
    expect(document.body.textContent).toContain('Local Postgres proof');
    expect(document.body.textContent).toContain('postgres - dvt');

    await harness.clickTab('Browse');
    await harness.flushPendingWork();

    expect(listWarehouseTables).toHaveBeenCalledWith('local-postgres-proof');
    expect(document.body.textContent).toContain('dvt.public.orders');
  });

  it('does not create a warehouse connection when required command fields are missing', async () => {
    const createWarehouseConnection = vi.fn(
      buildWarehouseSourceImportPort().createWarehouseConnection
    );

    await harness.renderWizard({
      warehouseSourceImport: buildWarehouseSourceImportPort({
        listWarehouseConnections: async () => [],
        createWarehouseConnection,
      }),
    });

    await harness.clickButtonContaining('New connection');
    await harness.fillInputByLabel('Connection name', 'Incomplete connection');
    await harness.clickButtonContaining('Create connection');
    await harness.flushPendingWork();

    expect(createWarehouseConnection).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain(
      'Name, database, and credential reference are required.'
    );
  });

  it('completes import flow, applies imported sources immediately, and renders a passive result step', async () => {
    const onComplete = vi.fn();
    const onClose = vi.fn();

    await harness.renderWizard({ onClose, onComplete });

    await harness.clickConnectionOption('Snowflake PROD');
    await harness.clickTab('Browse');
    await harness.clickTableSelectionCheckbox('RAW.ERP.ORDERS');
    await harness.clickTab('Selected');
    await harness.clickButtonContaining('Attach sources to canvas');

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        importedNodeIds: ['src_erp_orders'],
      })
    );
    expect(document.body.textContent).toContain('Sources attached');
    expect(document.body.textContent).toContain('Groups created:');
    expect(document.body.textContent).toContain('models/sources/erp.yml');
    expect(document.body.textContent).toContain(
      'Canvas queued the imported source ids and will focus them when the governed draft authority refreshes'
    );
    expect(document.body.textContent).not.toContain('Add imported sources to canvas');

    await harness.clickButtonContaining('Done');

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('selects all visible source tables in a database category before attaching sources', async () => {
    const importSources = vi.fn(async (input: ImportSourcesInput) => ({
      success: true as const,
      sourcesCreated: input.tables.length,
      tablesImported: input.tables.length,
      yamlFiles: ['models/sources/raw.yml'],
      importedNodeIds: input.tables.map((table) => `src_${table.schema}_${table.table}`),
      grouping: 'database' as const,
      options: {
        includeColumns: input.includeColumns,
        addTests: input.addTests,
        addFreshness: input.addFreshness,
      },
    }));

    await harness.renderWizard({
      warehouseSourceImport: buildWarehouseSourceImportPort({
        listWarehouseTables: async () => [
          { database: 'RAW', schema: 'ERP', table: 'ORDERS', rowCount: 100 },
          { database: 'RAW', schema: 'CRM', table: 'CUSTOMERS', rowCount: 50 },
          { database: 'MART', schema: 'ERP', table: 'ORDERS', rowCount: 10 },
        ],
        importSources,
      }),
    });

    await harness.clickConnectionOption('Snowflake PROD');
    await harness.clickTab('Browse');
    await harness.clickDatabaseSelection('RAW');
    await harness.clickTab('Selected');
    await harness.clickButtonContaining('Attach sources to canvas');

    expect(importSources).toHaveBeenCalledWith(
      expect.objectContaining({
        tables: [
          expect.objectContaining({ database: 'RAW', schema: 'ERP', table: 'ORDERS' }),
          expect.objectContaining({ database: 'RAW', schema: 'CRM', table: 'CUSTOMERS' }),
        ],
      })
    );
  });

  it('surfaces a no-op result when the selected sources already exist and does not fire the canvas handoff', async () => {
    const onComplete = vi.fn();

    await harness.renderWizard({
      onComplete,
      warehouseSourceImport: buildWarehouseSourceImportPort({
        importSources: async () => ({
          success: true,
          sourcesCreated: 0,
          tablesImported: 1,
          yamlFiles: ['models/sources/erp.yml'],
          importedNodeIds: [],
          grouping: 'schema',
          options: {
            includeColumns: false,
            addTests: false,
            addFreshness: false,
          },
        }),
      }),
    });

    await harness.clickConnectionOption('Snowflake PROD');
    await harness.clickTab('Browse');
    await harness.clickTableSelectionCheckbox('RAW.ERP.ORDERS');
    await harness.clickTab('Selected');
    await harness.clickButtonContaining('Attach sources to canvas');

    expect(onComplete).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain('No new data objects were added');
    expect(document.body.textContent).toContain('Canvas stayed unchanged');
  });
});
