// @vitest-environment jsdom
import { fireEvent } from '@testing-library/dom';
import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useAuthoringFieldsHarness } from './DvtAuthoringFields.test-support';
import { buildDvtNode } from './DvtAuthoringFields.test-fixtures';
import type {
  IWarehouseSourceImportPort,
  TestWarehouseConnectionResult,
} from '../../ports/workspace';
import { createAppServicesTestOverrides } from '../../../testing/appServicesTestDoubles';
describe('DVT connection authoring', () => {
  const view = useAuthoringFieldsHarness();
  it('discards a connection-test response after the selected connection changes', async () => {
    const baseWarehouseSourceImport = createAppServicesTestOverrides().warehouseSourceImport;
    if (!baseWarehouseSourceImport)
      throw new Error('Warehouse source import test port is required.');
    let resolveConnectionTest!: (result: TestWarehouseConnectionResult) => void;
    const connectionTest = new Promise<TestWarehouseConnectionResult>((resolve) => {
      resolveConnectionTest = resolve;
    });
    const testWarehouseConnection = vi.fn(() => connectionTest);
    const warehouseSourceImport: IWarehouseSourceImportPort = {
      ...baseWarehouseSourceImport,
      listWarehouseConnections: async () => [
        { id: 'warehouse-a', name: 'Warehouse A', type: 'postgres', database: 'orders_a' },
        { id: 'warehouse-b', name: 'Warehouse B', type: 'postgres', database: 'orders_b' },
      ],
      testWarehouseConnection,
    };
    view.renderFields(
      buildDvtNode('dvt:source', {
        connectionRef: {
          schemaVersion: 'connection-ref.v1',
          connectionId: 'warehouse-a',
          provider: 'postgres',
        },
        config: { schema: 'raw', table: 'orders', alias: 'orders' },
      }),
      warehouseSourceImport
    );
    await act(async () => Promise.resolve());

    const connectionSelect = view.container.querySelector(
      'select[name="dvt-source-connection"]'
    ) as HTMLSelectElement;
    const testButton = [...view.container.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Test')
    );
    expect(testButton).toBeDefined();

    act(() => {
      fireEvent.click(testButton!);
      fireEvent.change(connectionSelect, { target: { value: 'warehouse-b' } });
    });
    await act(async () => {
      resolveConnectionTest({
        connectionId: 'warehouse-a',
        status: 'passed',
        checkedAt: '2026-08-15T00:00:00.000Z',
        objectCount: 12,
      });
      await connectionTest;
    });

    expect(testWarehouseConnection).toHaveBeenCalledWith('warehouse-a');
    expect(connectionSelect.value).toBe('warehouse-b');
    expect(view.container.querySelector('[role="status"]')).toBeNull();
  });

  it('clears visible connection-test feedback after an authoritative selection change', async () => {
    const baseWarehouseSourceImport = createAppServicesTestOverrides().warehouseSourceImport;
    if (!baseWarehouseSourceImport)
      throw new Error('Warehouse source import test port is required.');
    const warehouseSourceImport: IWarehouseSourceImportPort = {
      ...baseWarehouseSourceImport,
      listWarehouseConnections: async () => [
        { id: 'warehouse-a', name: 'Warehouse A', type: 'postgres', database: 'orders_a' },
        { id: 'warehouse-b', name: 'Warehouse B', type: 'postgres', database: 'orders_b' },
      ],
      testWarehouseConnection: async (connectionId) => ({
        connectionId,
        status: 'passed',
        checkedAt: '2026-08-15T00:00:00.000Z',
        objectCount: 12,
      }),
    };
    view.renderFields(
      buildDvtNode('dvt:source', {
        connectionRef: {
          schemaVersion: 'connection-ref.v1',
          connectionId: 'warehouse-a',
          provider: 'postgres',
        },
        config: { schema: 'raw', table: 'orders', alias: 'orders' },
      }),
      warehouseSourceImport,
      'warehouse-b'
    );
    await act(async () => Promise.resolve());

    const testButton = [...view.container.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Test')
    );
    expect(testButton).toBeDefined();
    await act(async () => {
      fireEvent.click(testButton!);
      await Promise.resolve();
    });
    expect(view.container.querySelector('[role="status"]')).not.toBeNull();

    act(() => {
      fireEvent.click(view.container.querySelector('[data-slot="load-external-connection"]')!);
    });

    expect(
      (view.container.querySelector('select[name="dvt-source-connection"]') as HTMLSelectElement)
        .value
    ).toBe('warehouse-b');
    expect(view.container.querySelector('[role="status"]')).toBeNull();
  });
});
