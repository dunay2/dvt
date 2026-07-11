// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildWarehouseSourceImportPort,
  buildSourceObject,
  createSourceImportWizardHarness,
} from './SourceImportWizard.testHarness';
import type { ImportSourcesInput } from '../ports/workspace';
import { buildSourceImportTestMetricEvidence } from './sourceImportWizard/sourceImportWizard.testFixtures';

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
    expect(document.body.textContent).toContain('Local Postgres proof');
    expect(document.body.textContent).not.toContain('Snowflake PROD');
    expect(document.body.textContent).not.toContain('BigQuery');
    expect(document.body.textContent).not.toContain('Redshift');
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
    const connectionOption = harness.findConnectionOption('Local Postgres proof');

    expect(connectionOption).toBeDefined();
    expect(connectionOption?.tagName).toBe('BUTTON');

    await harness.clickConnectionOption('Local Postgres proof');
    await harness.clickTab('Browse');

    expect(document.body.textContent).toContain('Browse source objects');
    expect(document.body.textContent).toContain('ORDERS');
  });

  it('tests the selected warehouse connection before browsing source tables', async () => {
    const testWarehouseConnection = vi.fn(async (connectionId: string) => ({
      connectionId,
      status: 'passed' as const,
      checkedAt: '2026-06-08T00:00:00.000Z',
      objectCount: 12,
    }));

    await harness.renderWizard({
      warehouseSourceImport: buildWarehouseSourceImportPort({ testWarehouseConnection }),
    });

    await harness.clickConnectionOption('Local Postgres proof');
    await harness.clickButtonContaining('Test connection');
    await harness.flushPendingWork();

    expect(testWarehouseConnection).toHaveBeenCalledWith('conn-1');
    expect(document.body.textContent).toContain('Connection passed');
    expect(document.body.textContent).toContain('12 objects reachable');
  });

  it('creates a governed warehouse connection before browsing source tables', async () => {
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    const scrollIntoView = vi.fn();
    const createWarehouseConnection = vi.fn(async () => ({
      id: 'local-postgres-proof',
      name: 'Local Postgres proof',
      type: 'postgres' as const,
      database: 'dvt',
    }));
    const listSourceObjects = vi.fn(async () => [
      buildSourceObject({
        database: 'dvt',
        schema: 'public',
        table: 'orders',
        metricEvidence: buildSourceImportTestMetricEvidence(42, 4096),
      }),
    ]);

    HTMLElement.prototype.scrollIntoView =
      scrollIntoView as unknown as typeof HTMLElement.prototype.scrollIntoView;

    try {
      await harness.renderWizard({
        warehouseSourceImport: buildWarehouseSourceImportPort({
          listWarehouseConnections: async () => [],
          createWarehouseConnection,
          listSourceObjects,
        }),
      });

      await harness.clickButtonContaining('New connection');
      await harness.fillInputByLabel('Connection name', 'Local Postgres proof');
      await harness.selectByLabel('Connection type', 'postgres');
      await harness.fillInputByLabel('Database', 'dvt');
      await harness.fillInputByLabel(
        'Credential reference',
        'env:DVT_LOCAL_POSTGRES_WAREHOUSE_URL'
      );
      await harness.clickButtonContaining('Create connection');
      await harness.flushPendingWork();

      expect(createWarehouseConnection).toHaveBeenCalledWith({
        name: 'Local Postgres proof',
        type: 'postgres',
        database: 'dvt',
        credentialRef: 'env:DVT_LOCAL_POSTGRES_WAREHOUSE_URL',
      });
      expect(document.body.textContent).toContain('Local Postgres proof');
      expect(document.body.textContent).toContain('postgres - dvt');
      expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center', inline: 'nearest' });

      await harness.clickTab('Browse');
      await harness.flushPendingWork();

      expect(listSourceObjects).toHaveBeenCalledWith('local-postgres-proof');
      expect(document.body.textContent).toContain('dvt.public.orders');
    } finally {
      if (originalScrollIntoView) {
        HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
      } else {
        Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView');
      }
    }
  });

  it('offers only currently supported warehouse adapters when creating a connection', async () => {
    await harness.renderWizard({
      warehouseSourceImport: buildWarehouseSourceImportPort({
        listWarehouseConnections: async () => [],
      }),
    });

    await harness.clickButtonContaining('New connection');

    const typeSelect = document.querySelector<HTMLSelectElement>(
      'select[aria-label="Connection type"]'
    );
    const options = Array.from(typeSelect?.options ?? []).map((option) => option.value);

    expect(options).toEqual(['postgres']);
    expect(
      document.querySelector<HTMLInputElement>(
        '[data-slot="source-import-create-connection-credential-ref"]'
      )?.placeholder
    ).toBe('env:DVT_LOCAL_POSTGRES_WAREHOUSE_URL');
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

    await harness.clickConnectionOption('Local Postgres proof');
    await harness.clickTab('Browse');
    await harness.clickSourceObjectSelectionCheckbox(buildSourceObject().objectId);
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
      draftRevision: 'draft-revision-2',
      sourcesCreated: input.objects.length,
      objectsImported: input.objects.length,
      yamlFiles: ['models/sources/raw.yml'],
      importedNodeIds: input.objects.map((sourceObject) => `src_${sourceObject.objectId}`),
      grouping: 'database' as const,
      options: {
        includeColumns: input.includeColumns,
        addTests: input.addTests,
        addFreshness: input.addFreshness,
      },
    }));

    await harness.renderWizard({
      warehouseSourceImport: buildWarehouseSourceImportPort({
        listSourceObjects: async () => [
          buildSourceObject({
            database: 'RAW',
            schema: 'ERP',
            table: 'ORDERS',
            metricEvidence: buildSourceImportTestMetricEvidence(100, 4096),
          }),
          buildSourceObject({
            database: 'RAW',
            schema: 'CRM',
            table: 'CUSTOMERS',
            metricEvidence: buildSourceImportTestMetricEvidence(50, 2048),
          }),
          buildSourceObject({
            database: 'MART',
            schema: 'ERP',
            table: 'ORDERS',
            metricEvidence: buildSourceImportTestMetricEvidence(10, 1024),
          }),
        ],
        importSources,
      }),
    });

    await harness.clickConnectionOption('Local Postgres proof');
    await harness.clickTab('Browse');
    await harness.clickDatabaseSelection('RAW');
    await harness.clickTab('Selected');
    await harness.clickButtonContaining('Attach sources to canvas');

    expect(importSources).toHaveBeenCalledWith({
      connectionId: 'conn-1',
      objects: [
        {
          objectId: buildSourceObject({ database: 'RAW', schema: 'ERP', table: 'ORDERS' }).objectId,
        },
        {
          objectId: buildSourceObject({ database: 'RAW', schema: 'CRM', table: 'CUSTOMERS' })
            .objectId,
        },
      ],
      groupingStrategy: 'schema',
      includeColumns: true,
      addTests: false,
      addFreshness: false,
    });
  });

  it('surfaces a no-op result when the selected sources already exist and does not fire the canvas handoff', async () => {
    const onComplete = vi.fn();

    await harness.renderWizard({
      onComplete,
      warehouseSourceImport: buildWarehouseSourceImportPort({
        importSources: async () => ({
          success: true,
          draftRevision: 'draft-revision-2',
          sourcesCreated: 0,
          objectsImported: 1,
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

    await harness.clickConnectionOption('Local Postgres proof');
    await harness.clickTab('Browse');
    await harness.clickSourceObjectSelectionCheckbox(buildSourceObject().objectId);
    await harness.clickTab('Selected');
    await harness.clickButtonContaining('Attach sources to canvas');

    expect(onComplete).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain('No new data objects were added');
    expect(document.body.textContent).toContain('Canvas stayed unchanged');
  });
});
