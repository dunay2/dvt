import { describe, expect, it } from 'vitest';

import {
  createMockWorkspacePorts,
  createMockWorkspaceState,
} from '../../../testing/workspacePortDoubles';
import { createApiClientHarness } from './workspaceApiClient.test.harness';
import {
  buildWorkspaceScope,
  installWorkspaceScopeHarness,
  setWorkspaceScope,
} from './workspaceScope.test.harness';
import { createWorkspacePorts, resolveWorkspacePortCapabilities } from './workspacePorts';

describe('workspace ports source import', () => {
  installWorkspaceScopeHarness();

  it('advertises API source import capability explicitly', () => {
    expect(resolveWorkspacePortCapabilities()).toEqual({
      sourceImportAvailable: true,
    });
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

  it('uses protected API mode warehouse endpoints when source import is available', async () => {
    const scope = buildWorkspaceScope();
    setWorkspaceScope(scope);
    const { apiClient, getJson, postJson } = createApiClientHarness({
      getJson: async <TResponse>() =>
        [
          {
            id: 'warehouse-prod',
            name: 'Production warehouse',
            type: 'snowflake',
            database: 'analytics',
          },
        ] as TResponse,
      postJson: async <_TRequest, TResponse>() =>
        ({
          success: true,
          sourcesCreated: 0,
          tablesImported: 0,
          yamlFiles: [],
          importedNodeIds: [],
          grouping: 'schema',
          options: { includeColumns: false, addTests: false, addFreshness: false },
        }) as TResponse,
    });
    const ports = createWorkspacePorts(apiClient);

    await expect(ports.warehouseSourceImport.listWarehouseConnections()).resolves.toHaveLength(1);
    await expect(
      ports.warehouseSourceImport.importSources({
        connectionId: 'conn-1',
        tables: [],
        groupingStrategy: 'schema',
        includeColumns: false,
        addTests: false,
        addFreshness: false,
      })
    ).resolves.toMatchObject({ success: true });
    expect(getJson).toHaveBeenCalledWith(
      `/workspace/warehouse/connections?tenantId=${scope.tenantId}&projectId=${scope.projectId}&environmentId=${scope.environmentId}`
    );
    expect(postJson).toHaveBeenCalledWith(
      `/workspace/sources/import?tenantId=${scope.tenantId}&projectId=${scope.projectId}&environmentId=${scope.environmentId}`,
      expect.objectContaining({ connectionId: 'conn-1' })
    );
  });
});
