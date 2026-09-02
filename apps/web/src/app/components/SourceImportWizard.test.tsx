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
import { ApiError } from '../services/api/createApiClient';

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
    expect(document.body.textContent).toContain('Cambiar nombre');
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

  it('renames the selected connection in place with localized accessible controls', async () => {
    useApplicationLanguageStore.getState().configureApplicationLanguage('es');
    const renameWarehouseConnection = vi.fn(
      async (connectionId: string, input: { readonly name: string }) => ({
        id: connectionId,
        name: input.name,
        type: 'postgres' as const,
        database: 'dvt',
      })
    );
    const onConnectionRenamed = vi.fn(async () => undefined);

    await harness.renderWizard({
      warehouseSourceImport: buildWarehouseSourceImportPort({ renameWarehouseConnection }),
      onConnectionRenamed,
    });

    const renameAction = harness.findButtonContaining('Cambiar nombre');
    expect(renameAction?.disabled).toBe(true);

    await harness.clickConnectionOption('Local Postgres proof');
    await harness.clickTab('Conexiones');
    expect(harness.findButtonContaining('Cambiar nombre')?.disabled).toBe(false);
    await harness.clickButtonContaining('Cambiar nombre');

    const nameInput = document.querySelector<HTMLInputElement>(
      '[aria-label="Nuevo nombre de la conexión"]'
    );
    const saveAction = harness.findButtonContaining('Guardar nombre');
    expect(nameInput?.value).toBe('Local Postgres proof');
    expect(document.activeElement).toBe(nameInput);
    expect(saveAction?.disabled).toBe(true);

    await harness.fillInputByLabel('Nuevo nombre de la conexión', 'Postgres principal');
    expect(saveAction?.disabled).toBe(false);
    await harness.clickButtonContaining('Guardar nombre');
    await harness.flushPendingWork();

    expect(renameWarehouseConnection).toHaveBeenCalledWith('conn-1', {
      name: 'Postgres principal',
    });
    expect(onConnectionRenamed).toHaveBeenCalledWith({
      id: 'conn-1',
      name: 'Postgres principal',
      type: 'postgres',
      database: 'dvt',
    });
    expect(harness.findConnectionOption('Postgres principal')).toBeDefined();
    expect(document.body.textContent).toContain('conn-1');
    expect(document.body.textContent).not.toContain('Local Postgres proof');
    expect(document.body.textContent).toContain('Nombre de la conexión actualizado');

    const renamedConnection = harness.findConnectionOption('Postgres principal');
    const renameSuccess = document.body.querySelector<HTMLElement>(
      '[data-slot="source-import-rename-connection-success"]'
    );
    const feedbackRegion = document.body.querySelector<HTMLElement>(
      '[data-slot="source-import-connection-feedback"]'
    );

    expect(renameSuccess?.parentElement).toBe(feedbackRegion);
    expect(
      renamedConnection && feedbackRegion
        ? renamedConnection.compareDocumentPosition(feedbackRegion) &
            Node.DOCUMENT_POSITION_FOLLOWING
        : 0
    ).not.toBe(0);
  });

  it('cancels connection rename with Escape and returns focus to its action', async () => {
    const onClose = vi.fn();
    await harness.renderWizard({ onClose });
    await harness.clickConnectionOption('Local Postgres proof');
    await harness.clickTab('Connections');
    await harness.clickButtonContaining('Rename connection');

    const nameInput = document.querySelector<HTMLInputElement>(
      '[aria-label="New connection name"]'
    );
    expect(nameInput).not.toBeNull();

    await act(async () => {
      nameInput?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
      );
    });

    expect(document.querySelector('[aria-label="New connection name"]')).toBeNull();
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    expect(document.activeElement).toBe(harness.findButtonContaining('Rename connection'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('localizes rename failures without exposing transport diagnostics', async () => {
    useApplicationLanguageStore.getState().configureApplicationLanguage('es');
    await harness.renderWizard({
      warehouseSourceImport: buildWarehouseSourceImportPort({
        renameWarehouseConnection: async () => {
          throw new Error('raw duplicate connection diagnostic');
        },
      }),
    });

    await harness.clickConnectionOption('Local Postgres proof');
    await harness.clickTab('Conexiones');
    await harness.clickButtonContaining('Cambiar nombre');
    await harness.fillInputByLabel('Nuevo nombre de la conexión', 'Postgres principal');
    await harness.clickButtonContaining('Guardar nombre');
    await harness.flushPendingWork();

    const alert = document.querySelector<HTMLElement>(
      '[data-slot="source-import-rename-connection-error"]'
    );
    const nameInput = document.querySelector<HTMLInputElement>(
      '[aria-label="Nuevo nombre de la conexión"]'
    );
    expect(alert?.getAttribute('role')).toBe('alert');
    expect(alert?.id).toBeTruthy();
    expect(nameInput?.getAttribute('aria-invalid')).toBe('true');
    expect(nameInput?.getAttribute('aria-errormessage')).toBe(alert?.id);
    expect(alert?.closest('form')).toBe(nameInput?.closest('form'));
    expect(alert?.textContent).toContain('No se pudo cambiar el nombre de la conexión.');
    expect(document.body.textContent).not.toContain('raw duplicate connection diagnostic');
  });

  it('explains a duplicate connection name without exposing its transport response', async () => {
    useApplicationLanguageStore.getState().configureApplicationLanguage('es');
    await harness.renderWizard({
      warehouseSourceImport: buildWarehouseSourceImportPort({
        renameWarehouseConnection: async () => {
          throw new ApiError({
            message: 'Request failed (409)',
            endpoint: '/workspace/warehouse/connections/conn-1',
            statusCode: 409,
            category: 'client',
            responseBody: {
              error: { type: 'conflict', reason: 'warehouse_connection_duplicate' },
            },
          });
        },
      }),
    });

    await harness.clickConnectionOption('Local Postgres proof');
    await harness.clickTab('Conexiones');
    await harness.clickButtonContaining('Cambiar nombre');
    await harness.fillInputByLabel('Nuevo nombre de la conexión', 'Postgres duplicado');
    await harness.clickButtonContaining('Guardar nombre');
    await harness.flushPendingWork();

    expect(document.body.textContent).toContain('Ya existe una conexión con ese nombre.');
    expect(document.body.textContent).not.toContain('warehouse_connection_name_conflict');

    await act(async () => {
      useApplicationLanguageStore.getState().configureApplicationLanguage('en');
    });

    expect(document.body.textContent).toContain('A connection with that name already exists.');
  });

  it('does not mislabel a catalog revision conflict as a duplicate name', async () => {
    useApplicationLanguageStore.getState().configureApplicationLanguage('es');
    await harness.renderWizard({
      warehouseSourceImport: buildWarehouseSourceImportPort({
        renameWarehouseConnection: async () => {
          throw new ApiError({
            message: 'Request failed (409)',
            endpoint: '/workspace/warehouse/connections/conn-1',
            statusCode: 409,
            category: 'client',
            responseBody: {
              error: { type: 'conflict', reason: 'workspace_file_revision_conflict' },
            },
          });
        },
      }),
    });

    await harness.clickConnectionOption('Local Postgres proof');
    await harness.clickTab('Conexiones');
    await harness.clickButtonContaining('Cambiar nombre');
    await harness.fillInputByLabel('Nuevo nombre de la conexión', 'Postgres principal');
    await harness.clickButtonContaining('Guardar nombre');
    await harness.flushPendingWork();

    expect(document.body.textContent).toContain('No se pudo cambiar el nombre de la conexión.');
    expect(document.body.textContent).not.toContain('Ya existe una conexión con ese nombre.');
    expect(document.body.textContent).not.toContain('workspace_file_revision_conflict');
  });

  it('keeps a connection catalog failure localized when the language changes', async () => {
    useApplicationLanguageStore.getState().configureApplicationLanguage('es');

    await harness.renderWizard({
      warehouseSourceImport: buildWarehouseSourceImportPort({
        listWarehouseConnections: async () => {
          throw new Error('raw connection catalog diagnostic');
        },
      }),
    });
    await harness.flushPendingWork();

    expect(document.body.textContent).toContain(
      'No se pudieron cargar las conexiones del warehouse.'
    );
    expect(document.body.textContent).not.toContain('raw connection catalog diagnostic');

    const catalogSummary = document.body.querySelector<HTMLElement>(
      '[data-slot="source-import-connection-summary"]'
    );
    const loadFailureAlert = document.body.querySelector<HTMLElement>(
      '[data-slot="source-import-connection-load-error"]'
    );
    const feedbackRegion = document.body.querySelector<HTMLElement>(
      '[data-slot="source-import-connection-feedback"]'
    );

    expect(loadFailureAlert?.parentElement).toBe(feedbackRegion);
    expect(
      catalogSummary && feedbackRegion
        ? catalogSummary.compareDocumentPosition(feedbackRegion) & Node.DOCUMENT_POSITION_FOLLOWING
        : 0
    ).not.toBe(0);

    await act(async () => {
      useApplicationLanguageStore.getState().configureApplicationLanguage('en');
    });

    expect(document.body.textContent).toContain('Failed to load warehouse connections.');
    expect(document.body.textContent).not.toContain(
      'No se pudieron cargar las conexiones del warehouse.'
    );
  });

  it('localizes source-object discovery failures without exposing adapter diagnostics', async () => {
    useApplicationLanguageStore.getState().configureApplicationLanguage('es');

    await harness.renderWizard({
      warehouseSourceImport: buildWarehouseSourceImportPort({
        listSourceObjects: async () => {
          throw new Error('raw source object diagnostic');
        },
      }),
    });
    await harness.clickConnectionOption('Local Postgres proof');
    await harness.flushPendingWork();

    expect(document.body.textContent).toContain('No se pudieron cargar los objetos de origen.');
    expect(document.body.textContent).not.toContain('raw source object diagnostic');
  });

  it('localizes connection test failures without exposing adapter diagnostics', async () => {
    useApplicationLanguageStore.getState().configureApplicationLanguage('es');

    await harness.renderWizard({
      warehouseSourceImport: buildWarehouseSourceImportPort({
        testWarehouseConnection: async () => {
          throw new Error('raw connection test diagnostic');
        },
      }),
    });
    await harness.clickConnectionOption('Local Postgres proof');
    await harness.clickTab('Conexiones');
    await harness.clickButtonContaining('Probar conexión');
    await harness.flushPendingWork();

    expect(document.body.textContent).toContain('No se pudo probar la conexión al warehouse.');
    expect(document.body.textContent).not.toContain('raw connection test diagnostic');

    const commandFailureAlert = document.body.querySelector<HTMLElement>(
      '[data-slot="source-import-connection-load-error"]'
    );

    expect(commandFailureAlert?.getAttribute('role')).toBe('alert');
    expect(commandFailureAlert?.getAttribute('aria-live')).toBe('assertive');
    expect(commandFailureAlert?.getAttribute('aria-atomic')).toBe('true');

    const selectedConnection = harness.findConnectionOption('Local Postgres proof');
    const feedbackRegion = document.body.querySelector<HTMLElement>(
      '[data-slot="source-import-connection-feedback"]'
    );

    expect(commandFailureAlert?.parentElement).toBe(feedbackRegion);
    expect(
      selectedConnection && feedbackRegion
        ? selectedConnection.compareDocumentPosition(feedbackRegion) &
            Node.DOCUMENT_POSITION_FOLLOWING
        : 0
    ).not.toBe(0);
  });

  it('localizes connection creation failures without exposing adapter diagnostics', async () => {
    useApplicationLanguageStore.getState().configureApplicationLanguage('es');

    await harness.renderWizard({
      warehouseSourceImport: buildWarehouseSourceImportPort({
        listWarehouseConnections: async () => [],
        createWarehouseConnection: async () => {
          throw new Error('raw connection creation diagnostic');
        },
      }),
    });
    await harness.clickButtonContaining('Nueva conexión');
    await harness.fillInputByLabel('Nombre de la conexión', 'Postgres local');
    await harness.fillInputByLabel('Base de datos', 'dvt');
    await harness.fillInputByLabel('Referencia de credencial', 'postgres:local-warehouse');
    await harness.clickButtonContaining('Crear conexión');
    await harness.flushPendingWork();

    expect(document.body.textContent).toContain('No se pudo crear la conexión al warehouse.');
    expect(document.body.textContent).not.toContain('raw connection creation diagnostic');

    const createNameInput = document.body.querySelector<HTMLInputElement>(
      '[data-slot="source-import-create-connection-name"]'
    );
    expect(createNameInput?.closest('form')?.textContent).toContain(
      'No se pudo crear la conexión al warehouse.'
    );
    expect(createNameInput?.getAttribute('aria-invalid')).toBeNull();
    expect(createNameInput?.getAttribute('aria-errormessage')).toBeNull();
  });

  it('explains a duplicate connection at the top of the create form', async () => {
    useApplicationLanguageStore.getState().configureApplicationLanguage('es');

    await harness.renderWizard({
      warehouseSourceImport: buildWarehouseSourceImportPort({
        createWarehouseConnection: async () => {
          throw new ApiError({
            message: 'Request failed (409)',
            endpoint: '/workspace/warehouse/connections',
            statusCode: 409,
            category: 'client',
            responseBody: {
              error: { type: 'conflict', reason: 'warehouse_connection_duplicate' },
            },
          });
        },
      }),
    });
    await harness.clickButtonContaining('Nueva conexión');
    await harness.fillInputByLabel('Nombre de la conexión', 'Local Postgres proof');
    await harness.fillInputByLabel('Base de datos', 'dvt');
    await harness.fillInputByLabel('Referencia de credencial', 'postgres:local-postgres-proof');
    await harness.clickButtonContaining('Crear conexión');
    await harness.flushPendingWork();

    const alert = document.body.querySelector<HTMLElement>(
      '[data-slot="source-import-create-connection-error"]'
    );
    const nameInput = document.body.querySelector<HTMLInputElement>(
      '[data-slot="source-import-create-connection-name"]'
    );

    expect(alert?.textContent).toContain(
      'Ya existe una conexión con ese nombre. Elige otro nombre.'
    );
    expect(alert?.getAttribute('role')).toBe('alert');
    expect(alert?.closest('form')).toBe(nameInput?.closest('form'));
    expect(nameInput?.getAttribute('aria-invalid')).toBe('true');
    expect(nameInput?.getAttribute('aria-errormessage')).toBe(alert?.id);
    expect(
      alert && nameInput
        ? alert.compareDocumentPosition(nameInput) & Node.DOCUMENT_POSITION_FOLLOWING
        : 0
    ).not.toBe(0);
    expect(document.body.textContent).not.toContain('warehouse_connection_duplicate');

    await act(async () => {
      useApplicationLanguageStore.getState().configureApplicationLanguage('en');
    });

    expect(alert?.textContent).toContain(
      'A connection with that name already exists. Choose another name.'
    );
  });

  it('rejects an invalid credential reference locally with field-specific localized feedback', async () => {
    useApplicationLanguageStore.getState().configureApplicationLanguage('es');
    const createWarehouseConnection = vi.fn(
      buildWarehouseSourceImportPort().createWarehouseConnection
    );

    await harness.renderWizard({
      warehouseSourceImport: buildWarehouseSourceImportPort({
        listWarehouseConnections: async () => [],
        createWarehouseConnection,
      }),
    });
    await harness.clickButtonContaining('Nueva conexión');
    await harness.fillInputByLabel('Nombre de la conexión', 'URL no permitida');
    await harness.fillInputByLabel('Base de datos', 'dvt');
    await harness.fillInputByLabel(
      'Referencia de credencial',
      'postgresql://dvt:secret@localhost:5432/dvt'
    );
    await harness.clickButtonContaining('Crear conexión');
    await harness.flushPendingWork();

    const alert = document.body.querySelector<HTMLElement>(
      '[data-slot="source-import-create-connection-error"]'
    );
    const nameInput = document.body.querySelector<HTMLInputElement>(
      '[data-slot="source-import-create-connection-name"]'
    );
    const databaseInput = document.body.querySelector<HTMLInputElement>(
      '[data-slot="source-import-create-connection-database"]'
    );
    const credentialInput = document.body.querySelector<HTMLInputElement>(
      '[data-slot="source-import-create-connection-credential-ref"]'
    );

    expect(createWarehouseConnection).not.toHaveBeenCalled();
    expect(alert?.textContent).toContain(
      'Usa una referencia con formato postgres:<alias>. No introduzcas la URL ni la contraseña.'
    );
    expect(nameInput?.getAttribute('aria-invalid')).toBeNull();
    expect(databaseInput?.getAttribute('aria-invalid')).toBeNull();
    expect(credentialInput?.getAttribute('aria-invalid')).toBe('true');
    expect(credentialInput?.getAttribute('aria-errormessage')).toBe(alert?.id);

    await act(async () => {
      useApplicationLanguageStore.getState().configureApplicationLanguage('en');
    });

    expect(alert?.textContent).toContain(
      'Use a reference in the format postgres:<alias>. Do not enter the URL or password.'
    );
  });

  it('translates authoritative invalid credential reference feedback from the API', async () => {
    useApplicationLanguageStore.getState().configureApplicationLanguage('es');
    const createWarehouseConnection = vi.fn(async () => {
      throw new ApiError({
        message: 'Request failed (400)',
        endpoint: '/workspace/warehouse/connections',
        statusCode: 400,
        category: 'client',
        responseBody: {
          error: {
            type: 'bad_request',
            reason: 'invalid_credential_reference',
            target: 'credentialRef',
          },
        },
      });
    });

    await harness.renderWizard({
      warehouseSourceImport: buildWarehouseSourceImportPort({
        listWarehouseConnections: async () => [],
        createWarehouseConnection,
      }),
    });
    await harness.clickButtonContaining('Nueva conexión');
    await harness.fillInputByLabel('Nombre de la conexión', 'Alias rechazado');
    await harness.fillInputByLabel('Base de datos', 'dvt');
    await harness.fillInputByLabel('Referencia de credencial', 'postgres:server-approved-alias');
    await harness.clickButtonContaining('Crear conexión');
    await harness.flushPendingWork();

    const alert = document.body.querySelector<HTMLElement>(
      '[data-slot="source-import-create-connection-error"]'
    );
    const credentialInput = document.body.querySelector<HTMLInputElement>(
      '[data-slot="source-import-create-connection-credential-ref"]'
    );

    expect(createWarehouseConnection).toHaveBeenCalledOnce();
    expect(alert?.textContent).toContain(
      'Usa una referencia con formato postgres:<alias>. No introduzcas la URL ni la contraseña.'
    );
    expect(credentialInput?.getAttribute('aria-invalid')).toBe('true');
    expect(credentialInput?.getAttribute('aria-errormessage')).toBe(alert?.id);
    expect(document.body.textContent).not.toContain('invalid_credential_reference');
  });

  it('localizes import failures in the review surface without exposing adapter diagnostics', async () => {
    useApplicationLanguageStore.getState().configureApplicationLanguage('es');

    await harness.renderWizard({
      warehouseSourceImport: buildWarehouseSourceImportPort({
        importSources: async () => {
          throw new Error('raw import diagnostic');
        },
      }),
    });
    await harness.clickConnectionOption('Local Postgres proof');
    await harness.clickTab('Explorar');
    await harness.clickSourceObjectSelectionCheckbox(buildSourceObject().objectId);
    await harness.clickTab('Seleccionados');
    await harness.clickButtonContaining('Adjuntar orígenes al canvas');
    await harness.flushPendingWork();

    expect(document.body.textContent).toContain('No se pudieron registrar los objetos de datos.');
    expect(document.body.textContent).not.toContain('raw import diagnostic');
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

  it('declares a wide responsive dialog and wrapping connection and form actions', async () => {
    await harness.renderWizard();

    const dialog = document.body.querySelector<HTMLElement>('[role="dialog"]');
    const connectionSummary = document.body.querySelector<HTMLElement>(
      '[data-slot="source-import-connection-summary"]'
    );
    const connectionActions = document.body.querySelector<HTMLElement>(
      '[data-slot="source-import-connection-actions"]'
    );

    expect(dialog?.className).toContain('sm:max-w-[min(64rem,calc(100vw-2rem))]');
    expect(dialog?.className).not.toContain('sm:max-w-5xl');
    expect(connectionSummary?.className).toContain('flex-col');
    expect(connectionSummary?.className).toContain('md:flex-row');
    expect(connectionActions?.className).toContain('grid');
    expect(connectionActions?.className).toContain('w-full');
    expect(connectionActions?.className).toContain('sm:grid-cols-3');

    const connectionActionButtons = Array.from(
      connectionActions?.querySelectorAll<HTMLButtonElement>('button') ?? []
    );
    expect(connectionActionButtons).toHaveLength(3);
    for (const action of connectionActionButtons) {
      expect(action.className).toContain('min-w-0');
      expect(action.className).toContain('w-full');
    }

    const attachAction = harness.findButtonContaining('Attach sources to canvas');
    expect(attachAction?.className).toContain('disabled:opacity-100');
    expect(attachAction?.className).toContain('disabled:text-slate-300');

    await harness.clickButtonContaining('New connection');

    const formActions = document.body.querySelector<HTMLElement>(
      '[data-slot="source-import-create-connection-actions"]'
    );
    expect(formActions?.className).toContain('grid');
    expect(formActions?.className).toContain('grid-cols-1');
    expect(formActions?.className).toContain('sm:grid-cols-2');
    expect(formActions?.className).toContain('sm:ml-auto');
    for (const action of Array.from(
      formActions?.querySelectorAll<HTMLButtonElement>('button') ?? []
    )) {
      expect(action.className).toContain('min-w-0');
      expect(action.className).toContain('w-full');
    }
    const createAction = document.body.querySelector<HTMLButtonElement>('button[type="submit"]');
    expect(createAction?.className).toContain('bg-blue-700');
    expect(createAction?.className).toContain('text-white');
    expect(
      document.body.querySelector('[data-slot="source-import-wizard-content-scroll"]')
    ).not.toBeNull();
    expect(document.body.textContent).toContain('Cancel');
    expect(document.body.textContent).toContain('Create connection');
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
    await harness.clickTab('Connections');
    await harness.clickButtonContaining('Test connection');
    await harness.flushPendingWork();

    expect(testWarehouseConnection).toHaveBeenCalledWith('conn-1');
    expect(document.body.textContent).toContain('Connection passed');
    expect(document.body.textContent).toContain('12 objects reachable');

    const selectedConnection = harness.findConnectionOption('Local Postgres proof');
    const successStatus = document.body.querySelector<HTMLElement>(
      '[data-slot="source-import-connection-test-success"]'
    );

    expect(successStatus).not.toBeNull();
    expect(successStatus?.getAttribute('role')).toBe('status');
    expect(successStatus?.getAttribute('aria-live')).toBe('polite');
    expect(successStatus?.className).toContain('text-xs');
    expect(successStatus?.closest('[data-slot="card"]')).toBeNull();
    expect(successStatus?.parentElement?.getAttribute('data-slot')).toBe(
      'source-import-connection-feedback'
    );
    expect(
      selectedConnection && successStatus
        ? selectedConnection.compareDocumentPosition(successStatus) &
            Node.DOCUMENT_POSITION_FOLLOWING
        : 0
    ).not.toBe(0);

    await act(async () => {
      useApplicationLanguageStore.getState().configureApplicationLanguage('es');
    });

    expect(successStatus?.textContent).toContain('Conexión correcta');
    expect(successStatus?.textContent).toContain('12 objetos accesibles');
  });

  it('announces a failed connection result while preserving prominent error styling', async () => {
    const testWarehouseConnection = vi.fn(async (connectionId: string) => ({
      connectionId,
      status: 'failed' as const,
      reason: 'connection_failed' as const,
      message: 'provider diagnostic that must not become product copy',
      checkedAt: '2026-06-08T00:00:00.000Z',
    }));

    await harness.renderWizard({
      warehouseSourceImport: buildWarehouseSourceImportPort({ testWarehouseConnection }),
    });

    await harness.clickConnectionOption('Local Postgres proof');
    await harness.clickTab('Connections');
    await harness.clickButtonContaining('Test connection');
    await harness.flushPendingWork();

    const resultFailureAlert = document.body.querySelector<HTMLElement>(
      '[data-slot="source-import-connection-test-failure"]'
    );

    expect(testWarehouseConnection).toHaveBeenCalledWith('conn-1');
    expect(resultFailureAlert?.getAttribute('role')).toBe('alert');
    expect(resultFailureAlert?.getAttribute('aria-live')).toBe('assertive');
    expect(resultFailureAlert?.getAttribute('aria-atomic')).toBe('true');
    expect(resultFailureAlert?.getAttribute('data-slot')).toBe(
      'source-import-connection-test-failure'
    );
    expect(resultFailureAlert?.className).toContain('border-red-700');
    expect(document.body.textContent).not.toContain(
      'provider diagnostic that must not become product copy'
    );

    const selectedConnection = harness.findConnectionOption('Local Postgres proof');
    const feedbackRegion = document.body.querySelector<HTMLElement>(
      '[data-slot="source-import-connection-feedback"]'
    );

    expect(resultFailureAlert?.parentElement).toBe(feedbackRegion);
    expect(
      selectedConnection && feedbackRegion
        ? selectedConnection.compareDocumentPosition(feedbackRegion) &
            Node.DOCUMENT_POSITION_FOLLOWING
        : 0
    ).not.toBe(0);
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
      await harness.fillInputByLabel('Credential reference', 'postgres:local-warehouse');
      await harness.clickButtonContaining('Create connection');
      await harness.flushPendingWork();

      expect(createWarehouseConnection).toHaveBeenCalledWith({
        name: 'Local Postgres proof',
        type: 'postgres',
        database: 'dvt',
        credentialRef: 'postgres:local-warehouse',
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
    ).toBe('postgres:local-warehouse');
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

    const alert = document.body.querySelector<HTMLElement>(
      '[data-slot="source-import-create-connection-error"]'
    );
    const nameInput = document.body.querySelector<HTMLInputElement>(
      '[data-slot="source-import-create-connection-name"]'
    );
    const databaseInput = document.body.querySelector<HTMLInputElement>(
      '[data-slot="source-import-create-connection-database"]'
    );
    const credentialInput = document.body.querySelector<HTMLInputElement>(
      '[data-slot="source-import-create-connection-credential-ref"]'
    );

    expect(nameInput?.getAttribute('aria-invalid')).toBeNull();
    expect(nameInput?.getAttribute('aria-errormessage')).toBeNull();
    expect(databaseInput?.getAttribute('aria-invalid')).toBe('true');
    expect(databaseInput?.getAttribute('aria-errormessage')).toBe(alert?.id);
    expect(credentialInput?.getAttribute('aria-invalid')).toBe('true');
    expect(credentialInput?.getAttribute('aria-errormessage')).toBe(alert?.id);
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
