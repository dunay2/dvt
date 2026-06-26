// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildWarehouseSourceImportPort,
  createSourceImportWizardHarness,
} from './SourceImportWizard.testHarness';

describe('SourceImportWizard plugin options', () => {
  let harness: ReturnType<typeof createSourceImportWizardHarness>;

  beforeEach(() => {
    harness = createSourceImportWizardHarness();
  });

  afterEach(() => {
    harness.cleanup();
  });

  it('requests column metadata by default when attaching selected sources', async () => {
    const importSources = vi.fn(buildWarehouseSourceImportPort().importSources);

    await harness.renderWizard({
      warehouseSourceImport: buildWarehouseSourceImportPort({ importSources }),
    });

    await harness.clickConnectionOption('Snowflake PROD');
    await harness.clickTab('Browse');
    await harness.clickClickableDivByText('ORDERS');
    await harness.clickTab('Selected');
    await harness.clickButtonContaining('Attach sources to canvas');

    expect(importSources).toHaveBeenCalledWith(
      expect.objectContaining({
        includeColumns: true,
        addTests: false,
        addFreshness: false,
      })
    );
  });

  it('renders only the source import options declared by the active plugin', async () => {
    await harness.renderWizard({
      sourceImportOptions: [
        {
          id: 'includeColumns',
          label: 'Include Column Metadata',
          description: 'Add columns to the plugin-owned source artifact.',
          defaultEnabled: false,
          order: 10,
        },
      ],
    });

    await harness.clickConnectionOption('Snowflake PROD');
    await harness.clickTab('Browse');
    await harness.clickClickableDivByText('ORDERS');
    await harness.clickTab('Metadata');

    expect(document.body.textContent).toContain('Include Column Metadata');
    expect(document.body.textContent).not.toContain('Add Generic Tests');
    expect(document.body.textContent).not.toContain('Add Freshness Checks');
  });

  it('applies plugin option defaults when runtime declarations arrive after mount', async () => {
    const importSources = vi.fn(buildWarehouseSourceImportPort().importSources);
    const warehouseSourceImport = buildWarehouseSourceImportPort({ importSources });

    await harness.renderWizard({
      warehouseSourceImport,
      sourceImportOptions: [],
    });
    await harness.renderWizard({
      warehouseSourceImport,
      sourceImportOptions: [
        {
          id: 'includeColumns',
          label: 'Include Column Metadata',
          description: 'Add columns to the plugin-owned source artifact.',
          defaultEnabled: true,
          order: 10,
        },
      ],
    });

    await harness.clickConnectionOption('Snowflake PROD');
    await harness.clickTab('Browse');
    await harness.clickClickableDivByText('ORDERS');
    await harness.clickTab('Metadata');
    await harness.clickButtonContaining('Attach sources to canvas');

    expect(importSources).toHaveBeenCalledWith(
      expect.objectContaining({
        includeColumns: true,
        addTests: false,
        addFreshness: false,
      })
    );
  });
});
