// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildWarehouseSourceImportPort,
  createSourceImportWizardHarness,
} from './SourceImportWizard.testHarness';

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
