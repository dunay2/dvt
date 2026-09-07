// @vitest-environment jsdom

import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { IWarehouseSourceImportPort } from '../ports/workspace';

import {
  buildSourceObject,
  buildSourceObjectCatalogResponder,
  buildWarehouseSourceImportPort,
  createSourceImportWizardHarness,
} from './SourceImportWizard.testHarness';
import { useApplicationLanguageStore } from '../stores/applicationLanguageStore';

describe('SourceImportWizard connection navigation', () => {
  let harness: ReturnType<typeof createSourceImportWizardHarness>;

  beforeEach(() => {
    useApplicationLanguageStore.getState().configureApplicationLanguage('en');
    harness = createSourceImportWizardHarness();
  });

  afterEach(() => {
    harness.cleanup();
    useApplicationLanguageStore.getState().configureApplicationLanguage('en');
  });

  it('discards a schema page that resolves after the selected connection changes', async () => {
    const staleObject = buildSourceObject({ database: 'OLD', schema: 'PUBLIC', table: 'STALE' });
    let resolveStalePage!: () => void;
    const stalePage = new Promise<
      Awaited<ReturnType<IWarehouseSourceImportPort['listSourceObjectCatalog']>>
    >((resolve) => {
      resolveStalePage = () =>
        resolve({ kind: 'object-page', objects: [staleObject], truncated: false });
    });
    const listSourceObjectCatalog = vi.fn<IWarehouseSourceImportPort['listSourceObjectCatalog']>(
      async (connectionId, request) => {
        if (request.kind === 'schema-list') {
          return {
            kind: 'schema-list',
            schemas: [
              connectionId === 'conn-old'
                ? { catalog: 'OLD', schema: 'PUBLIC', objectCount: 1 }
                : { catalog: 'CURRENT', schema: 'PUBLIC', objectCount: 1 },
            ],
            truncated: false,
          };
        }
        if (request.kind === 'schema-page' && connectionId === 'conn-old') {
          return stalePage;
        }
        return { kind: 'object-page', objects: [], truncated: false };
      }
    );

    await harness.renderWizard({
      warehouseSourceImport: buildWarehouseSourceImportPort({
        listWarehouseConnections: async () => [
          { id: 'conn-old', name: 'Old warehouse', type: 'postgres', database: 'old' },
          { id: 'conn-current', name: 'Current warehouse', type: 'postgres', database: 'current' },
        ],
        listSourceObjectCatalog,
      }),
    });
    await harness.clickConnectionOption('Old warehouse');
    await harness.flushPendingWork();
    await harness.expandCollapsedSourceSchemas();
    await harness.clickTab('Connections');
    await harness.clickConnectionOption('Current warehouse');
    await harness.flushPendingWork();
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });

    await act(async () => {
      resolveStalePage();
      await stalePage;
    });
    await harness.flushPendingWork();

    expect(document.body.textContent).toContain('CURRENT');
    expect(document.body.textContent).not.toContain('STALE');
  });

  it('discards a name search page that resolves after the query changes', async () => {
    const staleObject = buildSourceObject({ table: 'STALE_ORDERS' });
    const currentObject = buildSourceObject({ table: 'CURRENT_CUSTOMERS' });
    let resolveStaleSearch!: () => void;
    const staleSearch = new Promise<
      Awaited<ReturnType<IWarehouseSourceImportPort['listSourceObjectCatalog']>>
    >((resolve) => {
      resolveStaleSearch = () =>
        resolve({ kind: 'object-page', objects: [staleObject], truncated: false });
    });
    const listSourceObjectCatalog = vi.fn<IWarehouseSourceImportPort['listSourceObjectCatalog']>(
      async (_connectionId, request) => {
        if (request.kind === 'schema-list') {
          return {
            kind: 'schema-list',
            schemas: [{ catalog: 'RAW', schema: 'ERP', objectCount: 2 }],
            truncated: false,
          };
        }
        if (request.kind === 'name-search') {
          return request.name === 'orders'
            ? staleSearch
            : { kind: 'object-page', objects: [currentObject], truncated: false };
        }
        return { kind: 'object-page', objects: [], truncated: false };
      }
    );

    await harness.renderWizard({
      warehouseSourceImport: buildWarehouseSourceImportPort({ listSourceObjectCatalog }),
    });
    await harness.clickConnectionOption('Local Postgres proof');
    await harness.flushPendingWork();
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });
    const searchInput = document.querySelector<HTMLInputElement>(
      '[data-slot="source-import-object-search"]'
    );
    if (!searchInput) throw new Error('EXPECTED_SOURCE_CATALOG_SEARCH');
    const setSearchValue = async (value: string): Promise<void> => {
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(
          searchInput,
          value
        );
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      });
    };
    await setSearchValue('orders');
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 325));
    });
    await setSearchValue('customers');
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 325));
    });

    await act(async () => {
      resolveStaleSearch();
      await staleSearch;
    });
    await harness.flushPendingWork();

    expect(document.body.textContent).toContain('CURRENT_CUSTOMERS');
    expect(document.body.textContent).not.toContain('STALE_ORDERS');
  });
  it('opens Browse and loads its source objects when a connection is selected', async () => {
    const listSourceObjectCatalog = vi.fn(buildSourceObjectCatalogResponder([buildSourceObject()]));
    await harness.renderWizard({
      warehouseSourceImport: buildWarehouseSourceImportPort({ listSourceObjectCatalog }),
    });

    expect(harness.findTab('Browse')?.disabled).toBe(true);

    await harness.clickConnectionOption('Local Postgres proof');
    await harness.flushPendingWork();

    expect(harness.findTab('Browse')?.getAttribute('aria-selected')).toBe('true');
    expect(listSourceObjectCatalog).toHaveBeenCalledWith('conn-1', {
      kind: 'schema-list',
      limit: 50,
    });
  });
});
