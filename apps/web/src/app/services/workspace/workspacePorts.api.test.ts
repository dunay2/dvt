import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  buildGraphDraftSourceImportResult,
  buildSourceImportCommandInput,
} from '../../../testing/sourceImportTestFixtures';
import { ApiError } from '../api/createApiClient';
import { WorkspaceFileRevisionConflictError } from './workspaceErrors';
import {
  buildDraftReadNotFoundResponse,
  buildDraftReadOkResponse,
} from './workspaceGraphDraftProtocol.test.fixtures';
import {
  buildWorkspaceDiffChangesEndpoint,
  WORKSPACE_DIFF_CHANGES_ENDPOINT,
} from './workspaceDiffChangesHttp';
import { buildWorkspaceFileHistoryEndpoint } from './workspaceFileHistoryHttp';
import { buildWorkspaceGraphDraftEndpoint } from './workspaceGraphDraftHttp';
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
      requestRaw: async () => jsonResponse(buildDraftReadNotFoundResponse(scope), 404),
    });

    await expect(workspaceGraphSnapshotQuery.getGraphSnapshot()).resolves.toEqual({
      nodes: [],
      edges: [],
      authoringAuthority: {
        kind: 'unresolved',
        canvasId: null,
        reason: 'missing_authority',
      },
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
          kind: 'saved',
          disposition: 'created',
          path: 'pipelines/sales_pipeline.yaml',
          contentSha256: 'a'.repeat(64),
          lastModified: '2026-05-24T00:00:00.000Z',
        }) as TResponse,
    });

    await expect(
      workspaceFileContentCommand.saveFileContent({
        path: 'pipelines/sales_pipeline.yaml',
        content: 'nodes: []',
        expectedRevision: { kind: 'absent' },
      })
    ).resolves.toMatchObject({
      kind: 'saved',
      path: 'pipelines/sales_pipeline.yaml',
      contentSha256: 'a'.repeat(64),
    });
    expect(postJson).toHaveBeenCalledWith(
      `/workspace/files/pipelines%2Fsales_pipeline.yaml?tenantId=${scope.tenantId}&projectId=${scope.projectId}&environmentId=${scope.environmentId}`,
      { content: 'nodes: []', expectedRevision: { kind: 'absent' } }
    );
  });

  it('maps a canonical stale-revision response to a typed command error', async () => {
    setWorkspaceScope(buildWorkspaceScope());
    const { workspaceFileContentCommand } = createApiWorkspacePortHarness({
      postJson: async () => {
        throw new ApiError({
          message: 'Workspace file revision conflict',
          endpoint: '/workspace/files/models%2Forders.sql',
          statusCode: 409,
          category: 'client',
          responseBody: {
            error: { type: 'conflict', reason: 'workspace_file_revision_conflict' },
          },
        });
      },
    });

    await expect(
      workspaceFileContentCommand.saveFileContent({
        path: 'models/orders.sql',
        content: 'select 2',
        expectedRevision: { kind: 'content_sha256', value: 'a'.repeat(64) },
      })
    ).rejects.toBeInstanceOf(WorkspaceFileRevisionConflictError);
  });
});

describe('workspace ports api warehouse source import', () => {
  installWorkspaceScopeHarness();

  it('renames a warehouse connection through the scoped protected command endpoint', async () => {
    const scope = buildWorkspaceScope();
    setWorkspaceScope(scope);
    const { requestRaw, warehouseSourceImport } = createApiWorkspacePortHarness({
      requestRaw: async () =>
        jsonResponse({
          id: 'warehouse-prod',
          name: 'Finance warehouse',
          type: 'postgres',
          database: 'analytics',
        }),
    });

    await expect(
      (
        warehouseSourceImport as unknown as {
          renameWarehouseConnection(
            connectionId: string,
            input: { readonly name: string }
          ): Promise<unknown>;
        }
      ).renameWarehouseConnection('warehouse-prod', { name: 'Finance warehouse' })
    ).resolves.toEqual({
      id: 'warehouse-prod',
      name: 'Finance warehouse',
      type: 'postgres',
      database: 'analytics',
    });
    expect(requestRaw).toHaveBeenCalledWith(
      `/workspace/warehouse/connections/warehouse-prod?tenantId=${scope.tenantId}&projectId=${scope.projectId}&environmentId=${scope.environmentId}`,
      { method: 'PATCH', jsonBody: { name: 'Finance warehouse' } }
    );
  });

  it('loads warehouse connections through the scoped protected runtime endpoint', async () => {
    const scope = buildWorkspaceScope();
    setWorkspaceScope(scope);
    const { getJson, warehouseSourceImport } = createApiWorkspacePortHarness({
      getJson: async <TResponse>() =>
        [
          {
            id: 'warehouse-prod',
            name: 'Production warehouse',
            type: 'postgres',
            database: 'analytics',
          },
        ] as TResponse,
    });

    await expect(warehouseSourceImport.listWarehouseConnections()).resolves.toEqual([
      {
        id: 'warehouse-prod',
        name: 'Production warehouse',
        type: 'postgres',
        database: 'analytics',
      },
    ]);
    expect(getJson).toHaveBeenCalledWith(
      `/workspace/warehouse/connections?tenantId=${scope.tenantId}&projectId=${scope.projectId}&environmentId=${scope.environmentId}`
    );
  });

  it('loads source objects through the scoped protected runtime endpoint', async () => {
    const scope = buildWorkspaceScope();
    setWorkspaceScope(scope);
    const sourceObject = {
      objectId: 'relation/analytics/erp/orders',
      displayName: 'orders',
      locator: {
        kind: 'relation',
        catalog: 'analytics',
        schema: 'erp',
        name: 'orders',
        relationType: 'table',
      },
      metricEvidence: {
        observedAt: '2026-07-10T21:00:00.000Z',
        observationScope: { kind: 'snapshot' },
        rowCount: {
          value: 42,
          provenance: 'estimated',
          method: 'provider-statistics',
          confidence: 'medium',
        },
        byteSize: {
          value: 4096,
          provenance: 'measured',
          method: 'provider-storage-metadata',
          confidence: 'exact',
          basis: 'physical-allocation',
        },
      },
      columns: [{ name: 'id', type: 'number', nullable: false }],
    };
    const { getJson, warehouseSourceImport } = createApiWorkspacePortHarness({
      getJson: async <TResponse>() =>
        ({ contractVersion: 1, objects: [sourceObject] }) as TResponse,
    });

    await expect(warehouseSourceImport.listSourceObjects('warehouse-prod')).resolves.toEqual([
      sourceObject,
    ]);
    expect(getJson).toHaveBeenCalledWith(
      `/workspace/warehouse/connections/warehouse-prod/objects?tenantId=${scope.tenantId}&projectId=${scope.projectId}&environmentId=${scope.environmentId}`
    );
  });

  it('loads a bounded source data sample through its dedicated scoped query port', async () => {
    const scope = buildWorkspaceScope();
    setWorkspaceScope(scope);
    const sample = {
      contractVersion: 1,
      connectionId: 'warehouse-prod',
      objectId: 'relation/analytics/erp/orders',
      columns: [{ name: 'order_id', type: 'integer', nullable: false }],
      rows: [{ values: ['1'] }],
      limit: 20,
      truncated: false,
      sampledAt: '2026-08-17T10:00:00.000Z',
    };
    const { getJson, warehouseSourceDataSampleQuery } = createApiWorkspacePortHarness({
      getJson: async <TResponse>() => sample as TResponse,
    });

    await expect(
      warehouseSourceDataSampleQuery.previewSourceObjectRows({
        connectionId: 'warehouse-prod',
        objectId: 'relation/analytics/erp/orders',
        limit: 20,
      })
    ).resolves.toEqual(sample);
    expect(getJson).toHaveBeenCalledWith(
      `/workspace/warehouse/connections/warehouse-prod/source-data-sample?tenantId=${scope.tenantId}&projectId=${scope.projectId}&environmentId=${scope.environmentId}&objectId=${encodeURIComponent('relation/analytics/erp/orders')}&limit=20`
    );
  });

  it('rejects an unversioned source-object catalog response', async () => {
    const scope = buildWorkspaceScope();
    setWorkspaceScope(scope);
    const { warehouseSourceImport } = createApiWorkspacePortHarness({
      getJson: async <TResponse>() => [] as TResponse,
    });

    await expect(warehouseSourceImport.listSourceObjects('warehouse-prod')).rejects.toThrow();
  });

  it('imports selected warehouse sources through the scoped protected runtime command endpoint', async () => {
    const scope = buildWorkspaceScope();
    setWorkspaceScope(scope);
    const { postJson, warehouseSourceImport } = createApiWorkspacePortHarness({
      postJson: async <_TRequest, TResponse>() =>
        buildGraphDraftSourceImportResult({
          canvasId: 'canvas-orders',
          idempotencyKey: 'source-import:orders-1',
        }) as TResponse,
    });
    const command = buildSourceImportCommandInput({
      canvasId: 'canvas-orders',
      idempotencyKey: 'source-import:orders-1',
    });

    await expect(warehouseSourceImport.importSources(command)).resolves.toMatchObject({
      success: true,
      outcome: {
        kind: 'graph-draft',
        importedNodeIds: ['src_erp_orders'],
      },
    });
    expect(postJson).toHaveBeenCalledWith(
      `/workspace/sources/import?tenantId=${scope.tenantId}&projectId=${scope.projectId}&environmentId=${scope.environmentId}`,
      command
    );
  });

  it('rejects an incomplete import receipt before updating canvas state', async () => {
    const { warehouseSourceImport } = createApiWorkspacePortHarness({
      postJson: async <_TRequest, TResponse>() =>
        ({
          success: true,
          sourcesCreated: 1,
          objectsImported: 1,
          yamlFiles: [],
          grouping: 'schema',
          options: { includeColumns: true, addTests: false, addFreshness: false },
        }) as TResponse,
    });

    await expect(
      warehouseSourceImport.importSources(buildSourceImportCommandInput())
    ).rejects.toThrow();
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
        credentialRef: 'postgres:finance-warehouse',
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
        credentialRef: 'postgres:finance-warehouse',
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
          objectCount: 3,
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
      objectCount: 3,
    });
    expect(postJson).toHaveBeenCalledWith(
      `/workspace/warehouse/connections/finance-warehouse/test?tenantId=${scope.tenantId}&projectId=${scope.projectId}&environmentId=${scope.environmentId}`,
      {}
    );
  });

  it('validates PostgreTransform SQL through the scoped protected query endpoint', async () => {
    const scope = buildWorkspaceScope();
    setWorkspaceScope(scope);
    const validation = {
      status: 'invalid' as const,
      diagnostics: [
        {
          code: 'undefined_column' as const,
          source: 'postgres' as const,
          message: 'column missing does not exist',
          startOffset: 7,
          endOffset: 14,
        },
      ],
    };
    const { postJson, warehouseSourceImport } = createApiWorkspacePortHarness({
      postJson: async <_TRequest, TResponse>() => validation as TResponse,
    });
    const input = {
      connectionRef: {
        schemaVersion: 'connection-ref.v1' as const,
        provider: 'postgres',
        connectionId: 'warehouse-prod',
      },
      sql: 'select missing from public.orders',
    };

    await expect(warehouseSourceImport.validatePostgresTransformSql(input)).resolves.toEqual(
      validation
    );
    expect(postJson).toHaveBeenCalledWith(
      `/workspace/warehouse/sql-validation?tenantId=${scope.tenantId}&projectId=${scope.projectId}&environmentId=${scope.environmentId}`,
      input
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
  });
});
