import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { buildDraftReadOkResponse } from './workspaceGraphDraftProtocol.test.fixtures';
import {
  buildWorkspaceDiffChangesEndpoint,
  WORKSPACE_DIFF_CHANGES_ENDPOINT,
} from './workspaceDiffChangesHttp';
import { buildWorkspaceFileHistoryEndpoint } from './workspaceFileHistoryHttp';
import {
  buildWorkspaceGraphDraftEndpoint,
  WORKSPACE_GRAPH_DRAFT_HTTP_ERROR_REASON,
} from './workspaceGraphDraftHttp';
import { buildWorkspacePluginsEndpoint } from './workspacePluginsHttp';
import { createApiWorkspacePortHarness } from './workspacePortsApi.test.harness';
import {
  buildWorkspaceScope,
  installWorkspaceScopeHarness,
  setWorkspaceScope,
} from './workspaceScope.test.harness';
import { httpErrorResponse, jsonResponse } from './workspaceApiClient.test.harness';

type ApiWorkspacePorts = ReturnType<typeof createApiWorkspacePortHarness>;

const unsupportedApiWorkspaceOperations: ReadonlyArray<{
  readonly operation: string;
  readonly capability: string;
  readonly rail: string;
  readonly call: (ports: ApiWorkspacePorts) => Promise<unknown>;
}> = [
  {
    operation: 'getRoles',
    capability: 'workspace.adminRoles',
    rail: 'ListAdminRoles',
    call: (ports) => ports.workspaceAdminRead.getRoles(),
  },
  {
    operation: 'getAuditLog',
    capability: 'workspace.adminAuditLog',
    rail: 'ListAdminAuditLog',
    call: (ports) => ports.workspaceAdminRead.getAuditLog(),
  },
] as const;

describe('workspace ports api graph snapshot', () => {
  installWorkspaceScopeHarness();

  it('projects the protected workspace graph draft into the canonical graph snapshot read model', async () => {
    const scope = buildWorkspaceScope();
    setWorkspaceScope(scope);
    const { getJson, requestRaw, workspaceGraphSnapshotQuery } = createApiWorkspacePortHarness({
      getJson: async (endpoint) => {
        throw new Error(`Retired graph endpoint reached: ${endpoint}`);
      },
      requestRaw: async (endpoint, init) => {
        expect(endpoint).toBe(buildWorkspaceGraphDraftEndpoint(scope));
        expect(init).toMatchObject({ method: 'GET' });
        return jsonResponse(buildDraftReadOkResponse(scope));
      },
    });

    const snapshot = await workspaceGraphSnapshotQuery.getGraphSnapshot();

    expect(getJson).not.toHaveBeenCalled();
    expect(requestRaw).toHaveBeenCalledTimes(1);
    expect(snapshot.nodes.map((node) => node.id)).toEqual([
      'source_node',
      'transform_node',
      'sink_node',
    ]);
    expect(snapshot.nodes.find((node) => node.id === 'transform_node')).toMatchObject({
      name: 'transform',
      type: 'MODEL',
      package: 'dvt',
      path: 'models/transform.sql',
      status: 'idle',
      dependencies: ['source_node'],
    });
    expect(snapshot.edges.map((edge) => [edge.source, edge.target])).toEqual([
      ['source_node', 'transform_node'],
      ['transform_node', 'sink_node'],
    ]);
  });

  it('maps a missing protected draft to an empty graph snapshot instead of failing startup', async () => {
    const scope = buildWorkspaceScope();
    setWorkspaceScope(scope);
    const { getJson, workspaceGraphSnapshotQuery } = createApiWorkspacePortHarness({
      getJson: async (endpoint) => {
        throw new Error(`Retired graph endpoint reached: ${endpoint}`);
      },
      requestRaw: async () =>
        httpErrorResponse({
          type: 'not_found',
          reason: WORKSPACE_GRAPH_DRAFT_HTTP_ERROR_REASON.notFound,
          status: 404,
        }),
    });

    await expect(workspaceGraphSnapshotQuery.getGraphSnapshot()).resolves.toEqual({
      nodes: [],
      edges: [],
    });
    expect(getJson).not.toHaveBeenCalled();
  });
});

describe('workspace ports api diff changes', () => {
  installWorkspaceScopeHarness();

  it('loads diff changes through the scoped workspace diff query endpoint', async () => {
    const scope = buildWorkspaceScope();
    setWorkspaceScope(scope);
    const { getJson, workspaceDiffQuery } = createApiWorkspacePortHarness({
      getJson: async <TResponse>() =>
        [
          {
            id: 'diff-1',
            nodeId: 'model.orders',
            type: 'changed',
            severity: 'breaking',
            description: 'Column removed: discount_amount',
            oldValue: 'discount_amount DECIMAL',
            newValue: null,
          },
        ] as TResponse,
    });

    await expect(workspaceDiffQuery.getDiffChanges()).resolves.toEqual([
      {
        id: 'diff-1',
        nodeId: 'model.orders',
        type: 'changed',
        severity: 'breaking',
        description: 'Column removed: discount_amount',
        oldValue: 'discount_amount DECIMAL',
        newValue: null,
      },
    ]);
    expect(getJson).toHaveBeenCalledWith(buildWorkspaceDiffChangesEndpoint(scope));
  });
});

describe('workspace ports api plugin catalog', () => {
  installWorkspaceScopeHarness();

  it('loads DB-backed plugins through the scoped workspace plugin catalog endpoint', async () => {
    const scope = buildWorkspaceScope();
    setWorkspaceScope(scope);
    const { getJson, workspacePluginCatalogQuery } = createApiWorkspacePortHarness({
      getJson: async <TResponse>() =>
        ({
          plugins: [
            {
              id: 'warehouse-optimizer',
              name: 'Warehouse Optimizer',
              version: '0.1.0',
              description: 'DB-only cost policy plugin.',
              capabilities: ['cost.analyze'],
              enabled: true,
              permissions: [],
              backendPluginId: 'warehouse-optimizer',
            },
          ],
        }) as TResponse,
    });

    await expect(workspacePluginCatalogQuery.getPlugins()).resolves.toEqual([
      {
        id: 'warehouse-optimizer',
        name: 'Warehouse Optimizer',
        version: '0.1.0',
        description: 'DB-only cost policy plugin.',
        capabilities: ['cost.analyze'],
        enabled: true,
        permissions: [],
        backendPluginId: 'warehouse-optimizer',
      },
    ]);
    expect(getJson).toHaveBeenCalledWith(buildWorkspacePluginsEndpoint(scope));
  });
});

describe('workspace ports api file history', () => {
  installWorkspaceScopeHarness();

  it('loads selected file history through the scoped workspace file-history endpoint', async () => {
    const scope = buildWorkspaceScope();
    setWorkspaceScope(scope);
    const { getJson, workspaceFileHistoryQuery } = createApiWorkspacePortHarness({
      getJson: async <TResponse>() =>
        [
          {
            commitSha: '0123456789abcdef',
            shortSha: '0123456',
            authorName: 'Ada',
            authoredAt: '2026-05-22T12:00:00.000Z',
            subject: 'Update staging orders model',
            path: 'models/staging/stg_orders.sql',
          },
        ] as TResponse,
    });

    await expect(
      workspaceFileHistoryQuery.getFileHistory('models/staging/stg_orders.sql')
    ).resolves.toEqual([
      {
        commitSha: '0123456789abcdef',
        shortSha: '0123456',
        authorName: 'Ada',
        authoredAt: '2026-05-22T12:00:00.000Z',
        subject: 'Update staging orders model',
        path: 'models/staging/stg_orders.sql',
      },
    ]);
    expect(getJson).toHaveBeenCalledWith(
      buildWorkspaceFileHistoryEndpoint('models/staging/stg_orders.sql', scope)
    );
  });
});

describe('workspace ports api file content command', () => {
  installWorkspaceScopeHarness();

  it('saves file content through the scoped workspace file command endpoint', async () => {
    const scope = buildWorkspaceScope();
    setWorkspaceScope(scope);
    const { postJson, workspaceFileContentCommand } = createApiWorkspacePortHarness({
      postJson: async <_TRequest, TResponse>() =>
        ({
          path: 'pipelines/sales_pipeline.yaml',
          name: 'sales_pipeline.yaml',
          language: 'yaml',
          content: 'nodes: []',
          lastModified: '2026-05-24T00:00:00.000Z',
        }) as TResponse,
    });

    await expect(
      workspaceFileContentCommand.saveFileContent('pipelines/sales_pipeline.yaml', 'nodes: []')
    ).resolves.toMatchObject({
      path: 'pipelines/sales_pipeline.yaml',
      content: 'nodes: []',
    });
    expect(postJson).toHaveBeenCalledWith(
      `/workspace/files/pipelines%2Fsales_pipeline.yaml?tenantId=${scope.tenantId}&projectId=${scope.projectId}&environmentId=${scope.environmentId}`,
      { content: 'nodes: []' }
    );
  });
});

describe('workspace ports api warehouse source import', () => {
  installWorkspaceScopeHarness();

  it('loads warehouse connections through the scoped protected runtime endpoint', async () => {
    const scope = buildWorkspaceScope();
    setWorkspaceScope(scope);
    const { getJson, warehouseSourceImport } = createApiWorkspacePortHarness({
      getJson: async <TResponse>() =>
        [
          {
            id: 'warehouse-prod',
            name: 'Production warehouse',
            type: 'snowflake',
            database: 'analytics',
          },
        ] as TResponse,
    });

    await expect(warehouseSourceImport.listWarehouseConnections()).resolves.toEqual([
      {
        id: 'warehouse-prod',
        name: 'Production warehouse',
        type: 'snowflake',
        database: 'analytics',
      },
    ]);
    expect(getJson).toHaveBeenCalledWith(
      `/workspace/warehouse/connections?tenantId=${scope.tenantId}&projectId=${scope.projectId}&environmentId=${scope.environmentId}`
    );
  });

  it('loads warehouse tables through the scoped protected runtime endpoint', async () => {
    const scope = buildWorkspaceScope();
    setWorkspaceScope(scope);
    const { getJson, warehouseSourceImport } = createApiWorkspacePortHarness({
      getJson: async <TResponse>() =>
        [
          {
            database: 'analytics',
            schema: 'erp',
            table: 'orders',
            rowCount: 42,
            columns: [{ name: 'id', type: 'number', nullable: false }],
          },
        ] as TResponse,
    });

    await expect(warehouseSourceImport.listWarehouseTables('warehouse-prod')).resolves.toEqual([
      {
        database: 'analytics',
        schema: 'erp',
        table: 'orders',
        rowCount: 42,
        columns: [{ name: 'id', type: 'number', nullable: false }],
      },
    ]);
    expect(getJson).toHaveBeenCalledWith(
      `/workspace/warehouse/connections/warehouse-prod/tables?tenantId=${scope.tenantId}&projectId=${scope.projectId}&environmentId=${scope.environmentId}`
    );
  });

  it('imports selected warehouse sources through the scoped protected runtime command endpoint', async () => {
    const scope = buildWorkspaceScope();
    setWorkspaceScope(scope);
    const { postJson, warehouseSourceImport } = createApiWorkspacePortHarness({
      postJson: async <_TRequest, TResponse>() =>
        ({
          success: true,
          sourcesCreated: 1,
          tablesImported: 1,
          yamlFiles: ['models/sources/src_erp.yml'],
          importedNodeIds: ['src_erp_orders'],
          grouping: 'schema',
          options: { includeColumns: true, addTests: false, addFreshness: false },
        }) as TResponse,
    });

    await expect(
      warehouseSourceImport.importSources({
        connectionId: 'warehouse-prod',
        tables: [{ database: 'analytics', schema: 'erp', table: 'orders' }],
        groupingStrategy: 'schema',
        includeColumns: true,
        addTests: false,
        addFreshness: false,
      })
    ).resolves.toMatchObject({
      success: true,
      importedNodeIds: ['src_erp_orders'],
    });
    expect(postJson).toHaveBeenCalledWith(
      `/workspace/sources/import?tenantId=${scope.tenantId}&projectId=${scope.projectId}&environmentId=${scope.environmentId}`,
      {
        connectionId: 'warehouse-prod',
        tables: [{ database: 'analytics', schema: 'erp', table: 'orders' }],
        groupingStrategy: 'schema',
        includeColumns: true,
        addTests: false,
        addFreshness: false,
      }
    );
  });

  it('creates a warehouse connection through the scoped protected runtime command endpoint', async () => {
    const scope = buildWorkspaceScope();
    setWorkspaceScope(scope);
    const { postJson, warehouseSourceImport } = createApiWorkspacePortHarness({
      postJson: async <_TRequest, TResponse>() =>
        ({
          id: 'finance-warehouse',
          name: 'Finance warehouse',
          type: 'postgres',
          database: 'finance',
        }) as TResponse,
    });

    await expect(
      (
        warehouseSourceImport as unknown as {
          createWarehouseConnection(input: {
            name: string;
            type: 'postgres';
            database: string;
            credentialRef: string;
          }): Promise<unknown>;
        }
      ).createWarehouseConnection({
        name: 'Finance warehouse',
        type: 'postgres',
        database: 'finance',
        credentialRef: 'env:DVT_FINANCE_WAREHOUSE_URL',
      })
    ).resolves.toEqual({
      id: 'finance-warehouse',
      name: 'Finance warehouse',
      type: 'postgres',
      database: 'finance',
    });
    expect(postJson).toHaveBeenCalledWith(
      `/workspace/warehouse/connections?tenantId=${scope.tenantId}&projectId=${scope.projectId}&environmentId=${scope.environmentId}`,
      {
        name: 'Finance warehouse',
        type: 'postgres',
        database: 'finance',
        credentialRef: 'env:DVT_FINANCE_WAREHOUSE_URL',
      }
    );
  });

  it('tests a warehouse connection through the scoped protected runtime command endpoint', async () => {
    const scope = buildWorkspaceScope();
    setWorkspaceScope(scope);
    const { postJson, warehouseSourceImport } = createApiWorkspacePortHarness({
      postJson: async <_TRequest, TResponse>() =>
        ({
          connectionId: 'finance-warehouse',
          status: 'passed',
          checkedAt: '2026-06-08T00:00:00.000Z',
          tableCount: 3,
        }) as TResponse,
    });

    await expect(
      (
        warehouseSourceImport as unknown as {
          testWarehouseConnection(connectionId: string): Promise<unknown>;
        }
      ).testWarehouseConnection('finance-warehouse')
    ).resolves.toEqual({
      connectionId: 'finance-warehouse',
      status: 'passed',
      checkedAt: '2026-06-08T00:00:00.000Z',
      tableCount: 3,
    });
    expect(postJson).toHaveBeenCalledWith(
      `/workspace/warehouse/connections/finance-warehouse/test?tenantId=${scope.tenantId}&projectId=${scope.projectId}&environmentId=${scope.environmentId}`,
      {}
    );
  });
});

describe('workspace ports api route parity posture', () => {
  it.each(unsupportedApiWorkspaceOperations)(
    'fails closed for %s before issuing transport calls',
    async ({ call, capability, rail }) => {
      const ports = createApiWorkspacePortHarness();
      const { getJson, postJson, requestRaw } = ports;

      await expect(call(ports)).rejects.toMatchObject({
        name: 'WorkspaceApiCapabilityUnsupportedError',
        capability,
        rail,
      });
      expect(getJson).not.toHaveBeenCalled();
      expect(postJson).not.toHaveBeenCalled();
      expect(requestRaw).not.toHaveBeenCalled();
    }
  );

  it('does not retain orphan API route literals for missing workspace rails', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/app/services/workspace/workspacePorts.api.ts'),
      'utf8'
    );

    expect(source).not.toContain(`getJson<DiffChange[]>('${WORKSPACE_DIFF_CHANGES_ENDPOINT}')`);
    expect(source).not.toContain('/admin/roles');
    expect(source).not.toContain('/admin/audit');
    expect(source).toContain('postJson<{ content: string }, FileContent>');
  });
});
