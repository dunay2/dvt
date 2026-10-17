// @vitest-environment jsdom

import { act } from 'react';
import { fireEvent } from '@testing-library/dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { IWarehouseSourceImportPort } from '../../ports/workspace';
import {
  buildSourceObject,
  buildSourceObjectCatalogResponder,
  buildWarehouseSourceImportPort,
  createSourceImportWizardHarness,
} from '../SourceImportWizard.testHarness';

type CataloguePage = Awaited<ReturnType<IWarehouseSourceImportPort['listSourceObjectCatalog']>>;

describe('Source Import catalogue request lifetimes', () => {
  let harness: ReturnType<typeof createSourceImportWizardHarness>;
  beforeEach(() => {
    harness = createSourceImportWizardHarness();
  });
  afterEach(() => {
    harness.cleanup();
    vi.useRealTimers();
  });

  it('ignores an old catalogue failure after closing and reopening on the same connection', async () => {
    let rejectOld: (error: Error) => void = () => {
      throw new Error('Old request was not started');
    };
    const orders = buildSourceObject({ table: 'ORDERS' });
    const catalogue = vi.fn(buildSourceObjectCatalogResponder([orders])).mockImplementationOnce(
      () =>
        new Promise<CataloguePage>((_resolve, reject) => {
          rejectOld = reject;
        })
    );
    const port = buildWarehouseSourceImportPort({ listSourceObjectCatalog: catalogue });
    const initialSelection = { connectionId: 'conn-1', sourceObjects: [orders] };
    await harness.renderWizard({ warehouseSourceImport: port, initialSelection });
    await harness.renderWizard({ warehouseSourceImport: port, initialSelection, open: false });
    await harness.renderWizard({ warehouseSourceImport: port, initialSelection });
    expect(harness.findButtonContaining('Add sources')?.disabled).toBe(false);
    await act(async () => {
      rejectOld(new Error('old transport failure'));
    });
    expect(document.body.textContent).toContain('Selected: 1');
    expect(document.body.textContent).not.toContain('Failed to load source objects.');
    expect(harness.findButtonContaining('Add sources')?.disabled).toBe(false);
  });

  it('keeps independent schema-page completions rather than discarding all but the latest', async () => {
    const one = buildSourceObject({ schema: 'ONE', table: 'FIRST' });
    const two = buildSourceObject({ schema: 'TWO', table: 'SECOND' });
    const respond = buildSourceObjectCatalogResponder([one, two]);
    const pending = new Map<string, (page: CataloguePage) => void>();
    const port = buildWarehouseSourceImportPort({
      listSourceObjectCatalog: (connection, request) =>
        request.kind === 'schema-page'
          ? new Promise<CataloguePage>((resolve) => {
              pending.set(request.schema, resolve);
            })
          : respond(connection, request),
    });
    await harness.renderWizard({ warehouseSourceImport: port });
    await harness.clickConnectionOption('Local Postgres proof');
    await harness.expandCollapsedSourceSchemas();
    expect([...pending.keys()]).toEqual(['ONE', 'TWO']);
    await act(async () => {
      pending.get('TWO')!({ kind: 'object-page', objects: [two], truncated: false });
    });
    await act(async () => {
      pending.get('ONE')!({ kind: 'object-page', objects: [one], truncated: false });
    });
    expect(document.querySelector(`[data-source-import-object="${one.objectId}"]`)).not.toBeNull();
    expect(document.querySelector(`[data-source-import-object="${two.objectId}"]`)).not.toBeNull();
  });

  it('rejects the first search response after query X changes to Y and back to X', async () => {
    vi.useFakeTimers();
    const old = buildSourceObject({ table: 'ORDERS_OLD' });
    const current = buildSourceObject({ table: 'ORDERS_NEW' });
    const respond = buildSourceObjectCatalogResponder([old, current]);
    const pending: Array<(page: CataloguePage) => void> = [];
    const port = buildWarehouseSourceImportPort({
      listSourceObjectCatalog: (connection, request) =>
        request.kind === 'name-search'
          ? new Promise<CataloguePage>((resolve) => {
              pending.push(resolve);
            })
          : respond(connection, request),
    });
    await harness.renderWizard({ warehouseSourceImport: port });
    await harness.clickConnectionOption('Local Postgres proof');
    const search = document.querySelector<HTMLInputElement>(
      '[data-slot="source-import-object-search"]'
    )!;
    for (const query of ['orders', 'customers', 'orders']) {
      await act(async () => {
        fireEvent.change(search, { target: { value: query } });
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(301);
      });
    }
    expect(pending).toHaveLength(3);
    await act(async () => {
      pending[0]!({ kind: 'object-page', objects: [old], truncated: false });
    });
    expect(document.querySelector(`[data-source-import-object="${old.objectId}"]`)).toBeNull();
    await act(async () => {
      pending[2]!({ kind: 'object-page', objects: [current], truncated: false });
    });
    expect(
      document.querySelector(`[data-source-import-object="${current.objectId}"]`)
    ).not.toBeNull();
    await act(async () => {
      pending[1]!({ kind: 'object-page', objects: [old], truncated: false });
    });
    expect(document.querySelector(`[data-source-import-object="${old.objectId}"]`)).toBeNull();
  });

  it('does not let connection actions clear a schema-page error', async () => {
    const respond = buildSourceObjectCatalogResponder([buildSourceObject()]);
    await harness.renderWizard({
      warehouseSourceImport: buildWarehouseSourceImportPort({
        listSourceObjectCatalog: (connection, request) =>
          request.kind === 'schema-page'
            ? Promise.reject(new Error('schema-page unavailable'))
            : respond(connection, request),
      }),
    });
    await harness.clickConnectionOption('Local Postgres proof');
    await harness.expandCollapsedSourceSchemas();
    await harness.clickTab('Connections');
    await harness.clickButtonContaining('Test connection');
    expect(document.body.textContent).toContain('Connection passed');
    await harness.clickButtonContaining('New connection');
    await harness.clickTab('Browse');
    expect(document.body.textContent).toContain('Failed to load source objects.');
  });
});
