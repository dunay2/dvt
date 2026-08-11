// @vitest-environment jsdom

import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildWarehouseSourceImportPort,
  buildSourceObject,
  createSourceImportWizardHarness,
} from './SourceImportWizard.testHarness';
import type { ImportSourcesInput } from '../ports/workspace';
import { buildGraphDraftSourceImportResult } from '../../testing/sourceImportTestFixtures';
import { buildSourceImportTestMetricEvidence } from './sourceImportWizard/sourceImportWizard.testFixtures';
import { useApplicationLanguageStore } from '../stores/applicationLanguageStore';

describe('SourceImportWizard', () => {
  let harness: ReturnType<typeof createSourceImportWizardHarness>;

  beforeEach(() => {
    useApplicationLanguageStore.getState().configureApplicationLanguage('en');
    harness = createSourceImportWizardHarness();
  });

  afterEach(() => {
    harness.cleanup();
    useApplicationLanguageStore.getState().configureApplicationLanguage('en');
  });

  it('renders the complete connection entry in Spanish and reacts to language changes', async () => {
    useApplicationLanguageStore.getState().configureApplicationLanguage('es');

    await harness.renderWizard();

    expect(document.body.textContent).toContain('Añadir origen');
    expect(document.body.textContent).toContain('Conexiones');
    expect(document.body.textContent).toContain('Explorar');
    expect(document.body.textContent).toContain('Metadatos');
    expect(document.body.textContent).toContain('Seleccionados');
    expect(document.body.textContent).toContain('Elegir conexión a base de datos');
    expect(document.body.textContent).toContain('1 conexión en el catálogo gobernado');
    expect(document.body.textContent).toContain('Nueva conexión');
    expect(document.body.textContent).toContain('Probar conexión');
    expect(document.body.textContent).toContain('Cancelar');
    expect(document.body.textContent).toContain('Adjuntar orígenes al canvas');
    expect(harness.findButtonContaining('Cerrar importación de orígenes')).toBeDefined();
    expect(document.body.textContent).not.toContain('Choose database connection');

    await harness.clickButtonContaining('Nueva conexión');

    expect(document.body.textContent).toContain('Registrar conexión a base de datos');
    expect(harness.findButtonContaining('Crear conexión')).toBeDefined();
    expect(document.querySelector('[aria-label="Nombre de la conexión"]')).not.toBeNull();
    expect(document.querySelector('[aria-label="Base de datos"]')).not.toBeNull();
    expect(document.querySelector('[aria-label="Referencia de credencial"]')).not.toBeNull();

    await act(async () => {
      useApplicationLanguageStore.getState().configureApplicationLanguage('en');
    });

    expect(document.body.textContent).toContain('Add source');
    expect(document.body.textContent).toContain('Register database connection');
    expect(document.body.textContent).not.toContain('Añadir origen');
  });

  it('keeps browse, metadata, options, review, numbers and result localized in Spanish', async () => {
    useApplicationLanguageStore.getState().configureApplicationLanguage('es');

    await harness.renderWizard({
      warehouseSourceImport: buildWarehouseSourceImportPort({
        listSourceObjects: async () => [
          buildSourceObject({
            metricEvidence: buildSourceImportTestMetricEvidence(15_000, 4096),
          }),
        ],
      }),
    });

    await harness.clickConnectionOption('Local Postgres proof');
    await harness.clickTab('Explorar');
    await harness.clickSourceObjectSelectionCheckbox(buildSourceObject().objectId);

    expect(document.body.textContent).toContain('Explorar objetos de origen');
    expect(document.body.textContent).toContain('15.000 filas');
    expect(document.body.textContent).toContain('Orígenes seleccionados');
    expect(
      document.body
        .querySelector('[data-slot="metric-evidence-hotspot"]')
        ?.getAttribute('aria-label')
    ).toContain('Estimado mediante estadísticas del proveedor. Confianza: media.');

    await harness.clickTab('Metadatos');

    expect(document.body.textContent).toContain('Metadatos del origen');
    expect(document.body.textContent).toContain('Opciones de metadatos');
    expect(document.body.textContent).toContain('Incluir metadatos de columnas');
    expect(document.body.textContent).toContain('Predeterminado: SÍ');
    expect(document.body.textContent).toContain('Estrategia de agrupación');
    expect(document.body.textContent).toContain('Agrupar por esquema');

    await harness.clickTab('Seleccionados');

    expect(document.body.textContent).toContain('Vista previa de adjuntos del canvas');
    expect(document.body.textContent).toContain('Conexión:');

    await harness.clickButtonContaining('Adjuntar orígenes al canvas');

    expect(document.body.textContent).toContain('Orígenes importados');
    expect(document.body.textContent).toContain('Archivos de origen actualizados');
    expect(harness.findButtonContaining('Terminar')).toBeDefined();
    expect(document.body.textContent).not.toContain('Sources imported');
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
        outcome: expect.objectContaining({
          kind: 'graph-draft',
          importedNodeIds: ['src_erp_orders'],
        }),
      })
    );
    expect(document.body.textContent).toContain('Sources imported');
    expect(document.querySelector('[data-slot="source-import-result"]')).not.toBeNull();
    expect(
      document.querySelector('[data-slot="source-import-objects-registered"]')?.textContent
    ).toBe('1');
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
    const importSources = vi.fn(async (input: ImportSourcesInput) =>
      buildGraphDraftSourceImportResult({
        canvasId: input.canvasId,
        idempotencyKey: input.idempotencyKey,
        sourcesCreated: input.objects.length,
        objectsImported: input.objects.length,
        yamlFiles: ['models/sources/raw.yml'],
        importedNodeIds: input.objects.map((sourceObject) => `src_${sourceObject.objectId}`),
        grouping: 'database',
        options: {
          includeColumns: input.includeColumns,
          addTests: input.addTests,
          addFreshness: input.addFreshness,
        },
      })
    );

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
      schemaVersion: 'source-import-request.v2',
      canvasId: 'canvas-orders',
      idempotencyKey: expect.stringMatching(/^source-import:/),
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

  it('reuses the command identity when a transient failure is retried unchanged', async () => {
    const onComplete = vi.fn();
    const importSources = vi
      .fn<
        (input: ImportSourcesInput) => Promise<ReturnType<typeof buildGraphDraftSourceImportResult>>
      >()
      .mockRejectedValueOnce(new Error('Connection interrupted'))
      .mockImplementation(async (input) =>
        buildGraphDraftSourceImportResult({
          canvasId: input.canvasId,
          idempotencyKey: input.idempotencyKey,
        })
      );

    await harness.renderWizard({
      onComplete,
      warehouseSourceImport: buildWarehouseSourceImportPort({
        importSources,
      }),
    });

    await harness.clickConnectionOption('Local Postgres proof');
    await harness.clickTab('Browse');
    await harness.clickSourceObjectSelectionCheckbox(buildSourceObject().objectId);
    await harness.clickTab('Selected');
    await harness.clickButtonContaining('Attach sources to canvas');
    await harness.flushPendingWork();

    expect(onComplete).not.toHaveBeenCalled();

    await harness.clickButtonContaining('Attach sources to canvas');
    await harness.flushPendingWork();

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(importSources).toHaveBeenCalledTimes(2);
    expect(importSources.mock.calls[1]?.[0].idempotencyKey).toBe(
      importSources.mock.calls[0]?.[0].idempotencyKey
    );
  });
});
