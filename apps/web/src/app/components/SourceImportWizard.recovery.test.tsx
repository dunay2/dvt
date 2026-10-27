// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useApplicationLanguageStore } from '../stores/applicationLanguageStore';

import {
  buildSourceObject,
  buildSourceObjectCatalogResponder,
  buildWarehouseSourceImportPort,
  createSourceImportWizardHarness,
} from './SourceImportWizard.testHarness';
import type { SourceImportInitialSelection } from './sourceImportWizard/types';

const dbtBinding: SourceImportInitialSelection = {
  kind: 'dbt-source-binding',
  sourceTableDeclarations: [
    {
      uniqueId: 'source.analytics.raw.orders',
      filePath: 'models/sources.yml',
      sourceName: 'raw',
      tableName: 'orders',
      database: 'RAW',
      schema: 'ERP',
      identifier: 'ORDERS',
    },
  ],
};

describe('SourceImportWizard catalogue recovery', () => {
  let harness: ReturnType<typeof createSourceImportWizardHarness>;

  beforeEach(() => {
    useApplicationLanguageStore.getState().configureApplicationLanguage('en');
    harness = createSourceImportWizardHarness();
  });
  afterEach(() => {
    harness.cleanup();
  });

  it('retains failed catalogue after a passing connection test and retries the full dbt binding', async () => {
    const catalogue = vi
      .fn(
        buildSourceObjectCatalogResponder([
          buildSourceObject({ database: 'RAW', schema: 'ERP', table: 'ORDERS' }),
        ])
      )
      .mockRejectedValueOnce(new Error('catalogue transport failed'));
    await harness.renderWizard({
      initialSelection: dbtBinding,
      warehouseSourceImport: buildWarehouseSourceImportPort({ listSourceObjectCatalog: catalogue }),
    });
    await harness.clickConnectionOption('Local Postgres proof');
    expect(document.body.textContent).toContain('Selected: 0');
    expect(document.body.textContent).toContain('Failed to load source objects.');
    await harness.clickTab('Connections');
    await harness.clickButtonContaining('Test connection');
    expect(document.body.textContent).toContain('Connection passed');
    expect(document.body.textContent).toContain('Failed to load source objects.');
    expect(catalogue).toHaveBeenCalledTimes(1);

    await harness.clickButtonContaining('Retry catalogue');
    expect(catalogue.mock.calls.map(([, request]) => request.kind)).toEqual([
      'schema-list',
      'schema-list',
      'name-search',
    ]);
    expect(document.body.textContent).toContain('Selected: 1');
    expect(document.body.textContent).not.toContain('Failed to load source objects.');
    expect(harness.findButtonContaining('Add sources')?.disabled).toBe(false);
  });

  it('keeps retry available after another failure without enabling import', async () => {
    await harness.renderWizard({
      initialSelection: dbtBinding,
      warehouseSourceImport: buildWarehouseSourceImportPort({
        listSourceObjectCatalog: vi.fn().mockRejectedValue(new Error('offline')),
      }),
    });
    await harness.clickConnectionOption('Local Postgres proof');
    await harness.clickButtonContaining('Retry catalogue');
    expect(document.body.textContent).toContain('Failed to load source objects.');
    expect(document.body.textContent).toContain('Selected: 0');
    expect(harness.findButtonContaining('Retry catalogue')?.disabled).toBe(false);
    expect(harness.findButtonContaining('Add sources')?.disabled).toBe(true);
  });

  it('recovers a current dbt matching failure without allowing connection actions to clear it', async () => {
    const catalogue = vi.fn(buildSourceObjectCatalogResponder([]));
    await harness.renderWizard({
      initialSelection: dbtBinding,
      warehouseSourceImport: buildWarehouseSourceImportPort({ listSourceObjectCatalog: catalogue }),
    });
    await harness.clickConnectionOption('Local Postgres proof');
    const failure =
      'This connection does not expose every table declared by the imported dbt sources.';
    expect(document.body.textContent).toContain(failure);
    expect(harness.findButtonContaining('Add sources')?.disabled).toBe(true);
    await harness.clickTab('Connections');
    await harness.clickButtonContaining('Test connection');
    await harness.clickButtonContaining('New connection');
    expect(document.body.textContent).toContain('Connection passed');
    expect(document.body.textContent).toContain(failure);
    catalogue.mockImplementation(
      buildSourceObjectCatalogResponder([
        buildSourceObject({ database: 'RAW', schema: 'ERP', table: 'ORDERS' }),
      ])
    );
    await harness.clickButtonContaining('Retry catalogue');
    expect(catalogue.mock.calls.map(([, request]) => request.kind)).toEqual([
      'schema-list',
      'name-search',
      'schema-list',
      'name-search',
    ]);
    expect(document.body.textContent).not.toContain(failure);
    expect(document.body.textContent).toContain('Selected: 1');
    expect(harness.findButtonContaining('Add sources')?.disabled).toBe(false);
  });
});
