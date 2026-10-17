// @vitest-environment jsdom

import { act } from 'react';
import { fireEvent } from '@testing-library/dom';
import { describe, expect, it, vi } from 'vitest';

import {
  buildSourceObject,
  buildSourceObjectCatalogResponder,
  buildWarehouseSourceImportPort,
  createSourceImportWizardHarness,
} from '../SourceImportWizard.testHarness';

describe('source import search-page recovery', () => {
  it('retains a failed continuation cursor so the same page can be retried', async () => {
    const harness = createSourceImportWizardHarness();
    vi.useFakeTimers();
    try {
      const first = buildSourceObject({ table: 'ORDERS_FIRST' });
      const second = buildSourceObject({ table: 'ORDERS_SECOND' });
      const respond = buildSourceObjectCatalogResponder([first, second]);
      const search = vi
        .fn()
        .mockResolvedValueOnce({
          kind: 'object-page',
          objects: [first],
          nextCursor: 'page-2',
          truncated: true,
        })
        .mockRejectedValueOnce(new Error('temporary page failure'))
        .mockResolvedValueOnce({ kind: 'object-page', objects: [second], truncated: false });
      await harness.renderWizard({
        warehouseSourceImport: buildWarehouseSourceImportPort({
          listSourceObjectCatalog: (connection, request) =>
            request.kind === 'name-search' ? search(request) : respond(connection, request),
        }),
      });
      await harness.clickConnectionOption('Local Postgres proof');
      const input = document.querySelector<HTMLInputElement>(
        '[data-slot="source-import-object-search"]'
      )!;
      await act(async () => {
        fireEvent.change(input, { target: { value: 'orders' } });
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(301);
      });
      await harness.clickButtonContaining('Load more');
      expect(document.body.textContent).toContain('Failed to load source objects.');
      expect(harness.findButtonContaining('Load more')).toBeDefined();
      await harness.clickButtonContaining('Load more');
      expect(search.mock.calls.map(([request]) => request.cursor)).toEqual([
        undefined,
        'page-2',
        'page-2',
      ]);
      expect(
        document.querySelector(`[data-source-import-object="${first.objectId}"]`)
      ).not.toBeNull();
      expect(
        document.querySelector(`[data-source-import-object="${second.objectId}"]`)
      ).not.toBeNull();
      expect(document.body.textContent).not.toContain('Failed to load source objects.');
    } finally {
      harness.cleanup();
      vi.useRealTimers();
    }
  });
});
