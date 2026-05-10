import { describe, expect, it } from 'vitest';

import {
  createMockWorkspacePorts,
  createMockWorkspaceState,
} from '../../../testing/workspacePortDoubles';
import { resolveWorkspacePortCopy } from './workspacePortCopy';
import { createWorkspacePorts, resolveWorkspacePortCapabilities } from './workspacePorts';

describe('workspace ports source import', () => {
  it('advertises API source import capability explicitly', () => {
    expect(resolveWorkspacePortCapabilities()).toEqual({
      sourceImportAvailable: false,
    });
  });

  it('keeps api-mode Spanish source import copy encoded as readable text', () => {
    expect(resolveWorkspacePortCopy('es-ES').warehouseImportApiModeUnavailable).toBe(
      'La importación de fuentes del warehouse no está disponible en modo API hasta que exista el endpoint del backend.'
    );
  });

  it('imports selected warehouse tables into the mock workspace graph', async () => {
    const ports = createMockWorkspacePorts();
    const before = await ports.workspaceGraphSnapshotQuery.getGraphSnapshot();

    const result = await ports.warehouseSourceImport.importSources({
      connectionId: 'conn-1',
      tables: [
        {
          database: 'RAW',
          schema: 'FINANCE',
          table: 'INVOICES',
          rowCount: 1200,
          columns: [
            { name: 'invoice_id', type: 'INTEGER', nullable: false },
            { name: 'customer_id', type: 'INTEGER', nullable: false },
          ],
        },
      ],
      groupingStrategy: 'schema',
      includeColumns: true,
      addTests: false,
      addFreshness: false,
    });

    const after = await ports.workspaceGraphSnapshotQuery.getGraphSnapshot();
    const importedNode = after.nodes.find((node) => node.id === 'src_finance_invoices');

    expect(result.success).toBe(true);
    expect(result.sourcesCreated).toBe(1);
    expect(result.tablesImported).toBe(1);
    expect(result.yamlFiles).toEqual(['models/sources/src_finance.yml']);
    expect(result.importedNodeIds).toEqual(['src_finance_invoices']);
    expect(after.nodes).toHaveLength(before.nodes.length + 1);
    expect(importedNode).toMatchObject({
      id: 'src_finance_invoices',
      type: 'SOURCE',
      path: 'models/sources/src_finance.yml',
    });
    expect(importedNode?.columns).toEqual([
      { name: 'invoice_id', type: 'INTEGER', nullable: false },
      { name: 'customer_id', type: 'INTEGER', nullable: false },
    ]);
  });

  it('isolates graph mutations between default mock service instances', async () => {
    const firstPorts = createMockWorkspacePorts();
    const secondPorts = createMockWorkspacePorts();
    const secondBefore = await secondPorts.workspaceGraphSnapshotQuery.getGraphSnapshot();

    await firstPorts.warehouseSourceImport.importSources({
      connectionId: 'conn-1',
      tables: [
        {
          database: 'RAW',
          schema: 'OPERATIONS',
          table: 'SHIPMENTS',
          rowCount: 6400,
          columns: [{ name: 'shipment_id', type: 'INTEGER', nullable: false }],
        },
      ],
      groupingStrategy: 'schema',
      includeColumns: true,
      addTests: false,
      addFreshness: false,
    });

    const firstAfter = await firstPorts.workspaceGraphSnapshotQuery.getGraphSnapshot();
    const secondAfter = await secondPorts.workspaceGraphSnapshotQuery.getGraphSnapshot();

    expect(firstAfter.nodes.some((node) => node.id === 'src_operations_shipments')).toBe(true);
    expect(secondAfter.nodes.some((node) => node.id === 'src_operations_shipments')).toBe(false);
    expect(secondAfter.nodes).toHaveLength(secondBefore.nodes.length);
  });

  it('shares mutable mock workspace state only when explicitly requested', async () => {
    const sharedState = createMockWorkspaceState();
    const firstPorts = createMockWorkspacePorts(sharedState);
    const secondPorts = createMockWorkspacePorts(sharedState);

    await firstPorts.warehouseSourceImport.importSources({
      connectionId: 'conn-1',
      tables: [
        {
          database: 'RAW',
          schema: 'SUPPORT',
          table: 'TICKETS',
          rowCount: 1500,
          columns: [{ name: 'ticket_id', type: 'INTEGER', nullable: false }],
        },
      ],
      groupingStrategy: 'schema',
      includeColumns: true,
      addTests: false,
      addFreshness: false,
    });

    const secondAfter = await secondPorts.workspaceGraphSnapshotQuery.getGraphSnapshot();

    expect(secondAfter.nodes.some((node) => node.id === 'src_support_tickets')).toBe(true);
  });

  it('fails explicitly in api mode until the backend endpoint exists', async () => {
    const ports = createWorkspacePorts();

    await expect(ports.warehouseSourceImport.listWarehouseConnections()).rejects.toThrow(
      'Warehouse source import is not available in API mode'
    );
    await expect(
      ports.warehouseSourceImport.importSources({
        connectionId: 'conn-1',
        tables: [],
        groupingStrategy: 'schema',
        includeColumns: false,
        addTests: false,
        addFreshness: false,
      })
    ).rejects.toThrow('Warehouse source import is not available in API mode');
  });
});
