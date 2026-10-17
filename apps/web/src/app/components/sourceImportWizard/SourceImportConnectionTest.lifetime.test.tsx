// @vitest-environment jsdom

import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildWarehouseSourceImportPort,
  createSourceImportWizardHarness,
} from '../SourceImportWizard.testHarness';
import type { TestWarehouseConnectionResult } from '../../ports/workspace';

describe('source import connection test lifetime', () => {
  let harness: ReturnType<typeof createSourceImportWizardHarness>;
  beforeEach(() => {
    harness = createSourceImportWizardHarness();
  });
  afterEach(() => {
    harness.cleanup();
  });

  it.each([
    ['connection', 'success'],
    ['connection', 'failure'],
    ['session', 'success'],
    ['session', 'failure'],
  ] as const)('ignores stale %s-scope %s while a new test is loading', async (change, outcome) => {
    const pending = new Map<
      number,
      { resolve(value: TestWarehouseConnectionResult): void; reject(error: Error): void }
    >();
    let sequence = 0;
    const port = buildWarehouseSourceImportPort({
      listWarehouseConnections: async () => [
        { id: 'A', name: 'Connection A', type: 'postgres', database: 'dvt' },
        { id: 'B', name: 'Connection B', type: 'postgres', database: 'dvt' },
      ],
      testWarehouseConnection: vi.fn(
        () =>
          new Promise<TestWarehouseConnectionResult>((resolve, reject) => {
            pending.set(++sequence, { resolve, reject });
          })
      ),
    });
    await harness.renderWizard({ warehouseSourceImport: port });
    await harness.clickConnectionOption('Connection A');
    await harness.clickTab('Connections');
    await harness.clickButtonContaining('Test connection');
    if (change === 'session') {
      await harness.renderWizard({ warehouseSourceImport: port, open: false });
      await harness.renderWizard({ warehouseSourceImport: port });
    } else {
      await harness.clickConnectionOption('Connection B');
      await harness.clickTab('Connections');
      await harness.clickConnectionOption('Connection A');
    }
    await harness.clickTab('Connections');
    await harness.clickButtonContaining('Test connection');
    await act(async () => {
      const initialRequest = pending.get(1)!;
      if (outcome === 'failure') initialRequest.reject(new Error('obsolete failure'));
      else
        initialRequest.resolve({
          connectionId: 'A',
          status: 'passed',
          checkedAt: '2026-10-17T00:00:00Z',
          objectCount: 999,
        });
    });
    expect(harness.findButtonContaining('Testing')?.disabled).toBe(true);
    expect(document.body.textContent).not.toContain('999');
    expect(document.body.textContent).not.toContain('Failed to test connection');
    await act(async () => {
      const latestRequest = pending.get(2)!;
      latestRequest.resolve({
        connectionId: 'A',
        status: 'passed',
        checkedAt: '2026-10-17T00:00:00Z',
        objectCount: 51,
      });
    });
    expect(document.body.textContent).toContain('51 objects reachable');
  });
});
