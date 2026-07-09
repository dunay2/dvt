import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import {
  DuplicateWarehouseConnectionError,
  WarehouseConnectionNotFoundError,
} from '../../../src/application/ports/warehouseSourceImport.js';
import type {
  CreateWarehouseConnectionCatalogInput,
  CreateWarehouseConnectionInput,
  IWarehouseConnectionCatalog,
  IWarehouseConnectionProbe,
  InspectWarehouseConnectionResult,
  TestWarehouseConnectionResult,
  WarehouseConnection,
  WarehouseConnectionCatalogEntry,
  WarehouseTable,
} from '../../../src/application/ports/warehouseSourceImport.js';
import { WorkspaceFileNotFoundError } from '../../../src/application/ports/workspaceFiles.js';
import type {
  IWorkspaceFileRepository,
  WorkspaceFileContent,
  WorkspaceFileEntry,
} from '../../../src/application/ports/workspaceFiles.js';
import { CreateWarehouseConnectionUseCase } from '../../../src/application/services/createWarehouseConnectionUseCase.js';
import { ImportWarehouseSourcesUseCase } from '../../../src/application/services/importWarehouseSourcesUseCase.js';
import { ListWarehouseConnectionsUseCase } from '../../../src/application/services/listWarehouseConnectionsUseCase.js';
import { ListWarehouseConnectionTablesUseCase } from '../../../src/application/services/listWarehouseConnectionTablesUseCase.js';
import { TestWarehouseConnectionUseCase } from '../../../src/application/services/testWarehouseConnectionUseCase.js';
import { registerWarehouseSourceImportRoutes } from '../../../src/entrypoints/http/warehouseSourceImportRoutes.js';
import {
  WORKSPACE_WAREHOUSE_CONNECTION_CATALOG_PATH,
  toWarehouseConnectionId,
} from '../../../src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.js';

const SCOPE_QUERY = 'tenantId=tenant-a&projectId=project-a&environmentId=env-a';

class TestWarehouseConnectionCatalog implements IWarehouseConnectionCatalog {
  public constructor(
    private entries: readonly WarehouseConnectionCatalogEntry[],
    private readonly saveConnection?: (
      input: CreateWarehouseConnectionCatalogInput,
      entries: readonly WarehouseConnectionCatalogEntry[]
    ) => Promise<void>
  ) {}

  public async listConnections(): Promise<readonly WarehouseConnection[]> {
    return this.entries.map(({ tables: _tables, ...connection }) => connection);
  }

  public async listTables(connectionId: string): Promise<readonly WarehouseTable[]> {
    return (await this.getConnection(connectionId)).tables;
  }

  public async getConnection(connectionId: string): Promise<WarehouseConnectionCatalogEntry> {
    const connection = this.entries.find((entry) => entry.id === connectionId);
    if (!connection) {
      throw new WarehouseConnectionNotFoundError(connectionId);
    }

    return connection;
  }

  public async createConnection(
    input: CreateWarehouseConnectionCatalogInput
  ): Promise<WarehouseConnection> {
    const id = toWarehouseConnectionId(input.name);
    const duplicate = this.entries.some(
      (entry) =>
        entry.id.toLowerCase() === id ||
        entry.name.trim().toLowerCase() === input.name.trim().toLowerCase()
    );
    if (duplicate) {
      throw new DuplicateWarehouseConnectionError(input.name);
    }

    const entry: WarehouseConnectionCatalogEntry = {
      id,
      name: input.name,
      type: input.type,
      database: input.database,
      credentialRef: input.credentialRef,
      tables: input.tables,
    };
    this.entries = [...this.entries, entry];
    await this.saveConnection?.(input, this.entries);
    const { tables: _tables, credentialRef: _credentialRef, ...connection } = entry;
    return connection;
  }
}

type TestWarehouseConnectionProbeFailure = Omit<
  Extract<InspectWarehouseConnectionResult, { readonly status: 'failed' }>,
  'checkedAt'
> & {
  readonly checkedAt?: string;
};

class TestWarehouseConnectionProbe implements IWarehouseConnectionProbe {
  public constructor(private readonly result: TestWarehouseConnectionProbeFailure | null) {}

  public async inspectConnection(
    input: CreateWarehouseConnectionInput
  ): Promise<InspectWarehouseConnectionResult> {
    if (this.result) {
      return { ...this.result, checkedAt: this.result.checkedAt ?? '2026-05-30T00:00:01.000Z' };
    }

    return {
      status: 'passed',
      checkedAt: '2026-05-30T00:00:01.000Z',
      tables: [{ database: input.database, schema: 'public', table: 'orders' }],
    };
  }

  public async testConnection(
    input: WarehouseConnectionCatalogEntry
  ): Promise<TestWarehouseConnectionResult> {
    if (this.result) {
      return {
        connectionId: input.id,
        ...this.result,
        checkedAt: this.result.checkedAt ?? '2026-05-30T00:00:01.000Z',
      };
    }

    return {
      connectionId: input.id,
      status: 'passed',
      checkedAt: '2026-05-30T00:00:01.000Z',
      tableCount: input.tables.length,
    };
  }
}

function principal(): Record<string, unknown> {
  return {
    principalId: 'user-1',
    subjectId: 'user-1',
    issuer: 'issuer',
    audience: 'audience',
    principalType: 'user',
    expiresAt: new Date('2030-01-01T00:00:00Z'),
    rawScopes: [],
    assertedTenantIds: ['tenant-a'],
    assertedProjectIds: ['project-a'],
  };
}

function buildApp(
  options: {
    readonly catalogEntries?: readonly WarehouseConnectionCatalogEntry[];
    readonly authenticated?: boolean;
    readonly authorized?: boolean;
    readonly saveResult?:
      | {
          readonly kind: 'saved';
          readonly schemaVersion: string;
          readonly revision: string;
          readonly updatedAt: string;
          readonly deduplicated: boolean;
        }
      | {
          readonly kind: 'conflict';
          readonly currentRevision: string;
          readonly storedSchemaVersion: string;
          readonly updatedAt: string | null;
        };
    readonly existingSourceFileContent?: string;
    readonly connectionTestResult?: TestWarehouseConnectionProbeFailure;
  } = {}
): {
  readonly app: FastifyInstance;
  readonly authorize: ReturnType<typeof vi.fn>;
  readonly draftStore: {
    readonly read: ReturnType<typeof vi.fn>;
    readonly save: ReturnType<typeof vi.fn>;
  };
  readonly workspaceFiles: {
    readonly getFileContent: ReturnType<typeof vi.fn>;
    readonly saveFileContent: ReturnType<typeof vi.fn>;
  };
} {
  const app = Fastify({ logger: false });
  const catalogEntries = options.catalogEntries ?? [
    {
      id: 'warehouse-prod',
      name: 'Production warehouse',
      type: 'postgres',
      database: 'analytics',
      tables: [
        {
          database: 'analytics',
          schema: 'erp',
          table: 'orders',
          rowCount: 42,
          byteSize: 4096000,
          columns: [
            { name: 'id', type: 'number', nullable: false, primaryKey: true, unique: true },
          ],
        },
      ],
    },
  ];
  const draftStore = {
    read: vi.fn().mockResolvedValue({
      scope: { tenantId: 'tenant-a', projectId: 'project-a', environmentId: 'env-a' },
      schemaVersion: 'workspace-graph-draft.v1',
      revision: 'rev-1',
      updatedAt: '2026-05-30T00:00:00.000Z',
      draftPayload: {
        canvas: { id: 'canvas-a', kind: 'canvas', title: 'Canvas' },
        activeCanvasId: 'canvas-a',
        nodeIds: [],
        nodePositions: {},
        nodes: [],
        edges: [],
        canvases: [
          {
            canvas: { id: 'canvas-a', kind: 'canvas', title: 'Canvas' },
            nodeIds: [],
            nodePositions: {},
            nodes: [],
            edges: [],
          },
        ],
      },
    }),
    save: vi.fn().mockResolvedValue(
      options.saveResult ?? {
        kind: 'saved',
        schemaVersion: 'workspace-graph-draft.v1',
        revision: 'rev-2',
        updatedAt: '2026-05-30T00:00:01.000Z',
        deduplicated: false,
      }
    ),
  };
  const workspaceFiles = {
    listFiles: vi.fn<() => Promise<readonly WorkspaceFileEntry[]>>().mockResolvedValue([]),
    getFileContent: vi
      .fn<(path: string) => Promise<WorkspaceFileContent>>()
      .mockImplementation(async (path) => {
        if (options.existingSourceFileContent !== undefined) {
          return {
            path,
            name: path.split('/').at(-1) ?? path,
            language: 'yaml',
            content: options.existingSourceFileContent,
            lastModified: '2026-05-30T00:00:00.000Z',
          };
        }
        throw new WorkspaceFileNotFoundError('models/sources/src_erp.yml');
      }),
    saveFileContent: vi.fn<(path: string, content: string) => Promise<WorkspaceFileContent>>(
      async (path, content) => ({
        path,
        name: path.split('/').at(-1) ?? path,
        language: 'yaml',
        content,
        lastModified: '2026-05-30T00:00:01.000Z',
      })
    ),
  };
  const catalog = new TestWarehouseConnectionCatalog(catalogEntries, async (_input, entries) => {
    await workspaceFiles.saveFileContent(
      WORKSPACE_WAREHOUSE_CONNECTION_CATALOG_PATH,
      JSON.stringify({ connections: entries }, null, 2)
    );
  });
  const probe = new TestWarehouseConnectionProbe(options.connectionTestResult ?? null);
  const authorize = vi.fn().mockResolvedValue(
    options.authorized === false
      ? { ok: false, reason: 'ACTION_NOT_GRANTED' }
      : {
          ok: true,
          context: {
            principal: principal(),
            scope: { resource: 'environment', tenantId: { value: 'tenant-a' } },
            action: { kind: 'query', name: 'workspace:source-import:view' },
            requestId: 'req-1',
            authorizedAt: new Date('2026-05-30T00:00:00Z'),
          },
        }
  );

  registerWarehouseSourceImportRoutes(app, {
    authenticator: {
      authenticateBearerToken: vi.fn().mockResolvedValue(
        options.authenticated === false
          ? { ok: false, code: 'missing_token' }
          : {
              ok: true,
              principal: principal(),
            }
      ),
    } as never,
    authorizer: { authorize } as never,
    listConnectionsUseCase: new ListWarehouseConnectionsUseCase(catalog),
    listTablesUseCase: new ListWarehouseConnectionTablesUseCase(catalog),
    createConnectionUseCase: new CreateWarehouseConnectionUseCase(catalog, probe),
    testConnectionUseCase: new TestWarehouseConnectionUseCase(catalog, probe),
    importSourcesUseCase: new ImportWarehouseSourcesUseCase(
      catalog,
      draftStore as never,
      workspaceFiles as IWorkspaceFileRepository,
      () => new Date('2026-05-30T00:00:01.000Z')
    ),
    rateLimit: { max: 100, timeWindow: 60_000 },
  });

  return { app, authorize, draftStore, workspaceFiles };
}

describe('warehouseSourceImportRoutes', () => {
  it('creates a warehouse connection through the protected command rail before listing it', async () => {
    const { app, authorize, workspaceFiles } = buildApp({ catalogEntries: [] });

    const response = await app.inject({
      method: 'POST',
      url: `/workspace/warehouse/connections?${SCOPE_QUERY}`,
      payload: {
        name: 'Finance warehouse',
        type: 'postgres',
        database: 'finance',
        credentialRef: 'env:DVT_FINANCE_WAREHOUSE_URL',
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      id: 'finance-warehouse',
      name: 'Finance warehouse',
      type: 'postgres',
      database: 'finance',
    });
    expect(authorize).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: { kind: 'command', name: 'workspace:source-connection:create' },
      }),
      expect.any(String)
    );
    expect(workspaceFiles.saveFileContent).toHaveBeenCalledWith(
      '.dvt/warehouse-connections.json',
      expect.not.stringContaining('DVT_FINANCE_WAREHOUSE_URL=')
    );
  });

  it('rejects duplicate warehouse connection names before mutating the catalog', async () => {
    const { app, workspaceFiles } = buildApp();

    const response = await app.inject({
      method: 'POST',
      url: `/workspace/warehouse/connections?${SCOPE_QUERY}`,
      payload: {
        name: 'Production warehouse',
        type: 'postgres',
        database: 'analytics',
        credentialRef: 'env:DVT_DUPLICATE_WAREHOUSE_URL',
      },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      error: { type: 'conflict', reason: 'warehouse_connection_duplicate' },
    });
    expect(workspaceFiles.saveFileContent).not.toHaveBeenCalled();
  });

  it('rejects unsupported warehouse adapters without probing credentials', async () => {
    const { app, workspaceFiles } = buildApp({ catalogEntries: [] });

    const response = await app.inject({
      method: 'POST',
      url: `/workspace/warehouse/connections?${SCOPE_QUERY}`,
      payload: {
        name: 'MySQL legacy',
        type: 'mysql',
        database: 'legacy',
        credentialRef: 'env:DVT_MYSQL_URL',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: { type: 'bad_request', reason: 'unsupported_warehouse_adapter', target: 'type' },
    });
    expect(workspaceFiles.saveFileContent).not.toHaveBeenCalled();
  });

  it('tests an existing warehouse connection through the protected command rail', async () => {
    const { app, authorize } = buildApp();

    const response = await app.inject({
      method: 'POST',
      url: `/workspace/warehouse/connections/warehouse-prod/test?${SCOPE_QUERY}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      connectionId: 'warehouse-prod',
      status: 'passed',
      checkedAt: '2026-05-30T00:00:01.000Z',
      tableCount: 1,
    });
    expect(authorize).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: { kind: 'command', name: 'workspace:source-connection:test' },
      }),
      expect.any(String)
    );
  });

  it('returns a failed connection-test result for invalid credentials without exposing secrets', async () => {
    const { app } = buildApp({
      connectionTestResult: {
        status: 'failed',
        reason: 'invalid_credentials',
        message: 'The credential reference could not authenticate.',
      },
    });

    const response = await app.inject({
      method: 'POST',
      url: `/workspace/warehouse/connections/warehouse-prod/test?${SCOPE_QUERY}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      connectionId: 'warehouse-prod',
      status: 'failed',
      reason: 'invalid_credentials',
      message: 'The credential reference could not authenticate.',
      checkedAt: '2026-05-30T00:00:01.000Z',
    });
    expect(response.body).not.toContain('env:');
  });

  it('rejects connection creation when credential testing fails', async () => {
    const { app, workspaceFiles } = buildApp({
      catalogEntries: [],
      connectionTestResult: {
        status: 'failed',
        reason: 'invalid_credentials',
        message: 'The credential reference could not authenticate.',
      },
    });

    const response = await app.inject({
      method: 'POST',
      url: `/workspace/warehouse/connections?${SCOPE_QUERY}`,
      payload: {
        name: 'Finance warehouse',
        type: 'postgres',
        database: 'finance',
        credentialRef: 'env:DVT_FINANCE_WAREHOUSE_URL',
      },
    });

    expect(response.statusCode).toBe(422);
    expect(response.json()).toEqual({
      error: { type: 'unprocessable_entity', reason: 'warehouse_connection_test_failed' },
    });
    expect(workspaceFiles.saveFileContent).not.toHaveBeenCalled();
  });

  it('lists warehouse connections through the protected query rail', async () => {
    const { app, authorize } = buildApp();

    const response = await app.inject({
      method: 'GET',
      url: `/workspace/warehouse/connections?${SCOPE_QUERY}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([
      {
        id: 'warehouse-prod',
        name: 'Production warehouse',
        type: 'postgres',
        database: 'analytics',
      },
    ]);
    expect(authorize).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: { kind: 'query', name: 'workspace:source-import:view' },
      }),
      expect.any(String)
    );
  });

  it('lists warehouse tables for a known connection', async () => {
    const { app } = buildApp();

    const response = await app.inject({
      method: 'GET',
      url: `/workspace/warehouse/connections/warehouse-prod/tables?${SCOPE_QUERY}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([
      {
        database: 'analytics',
        schema: 'erp',
        table: 'orders',
        rowCount: 42,
        byteSize: 4096000,
        columns: [{ name: 'id', type: 'number', nullable: false, primaryKey: true, unique: true }],
      },
    ]);
  });

  it('imports selected tables into the authoritative workspace graph draft', async () => {
    const { app, authorize, workspaceFiles } = buildApp();

    const response = await app.inject({
      method: 'POST',
      url: `/workspace/sources/import?${SCOPE_QUERY}`,
      payload: {
        connectionId: 'warehouse-prod',
        tables: [{ database: 'analytics', schema: 'erp', table: 'orders' }],
        groupingStrategy: 'schema',
        includeColumns: true,
        addTests: false,
        addFreshness: false,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      success: true,
      draftRevision: 'rev-2',
      sourcesCreated: 1,
      tablesImported: 1,
      yamlFiles: ['models/sources/src_erp.yml'],
      importedNodeIds: ['src_warehouse_prod_analytics_erp_orders'],
      grouping: 'schema',
    });
    expect(authorize).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: { kind: 'command', name: 'workspace:source-import:import' },
      }),
      expect.any(String)
    );
    expect(workspaceFiles.saveFileContent).toHaveBeenCalledWith(
      'models/sources/src_erp.yml',
      [
        'version: 2',
        '',
        'sources:',
        '  - name: warehouse_prod_analytics_erp',
        '    database: analytics',
        '    schema: erp',
        '    tables:',
        '      - name: orders',
        '        columns:',
        '          - name: id',
        '            data_type: number',
        '',
      ].join('\n')
    );
  });

  it('uses catalog-owned table metadata instead of client-supplied columns', async () => {
    const { app, draftStore } = buildApp();

    const response = await app.inject({
      method: 'POST',
      url: `/workspace/sources/import?${SCOPE_QUERY}`,
      payload: {
        connectionId: 'warehouse-prod',
        tables: [
          {
            database: 'analytics',
            schema: 'erp',
            table: 'orders',
            columns: [{ name: 'fake_admin_token', type: 'string', nullable: false }],
          },
        ],
        groupingStrategy: 'schema',
        includeColumns: true,
        addTests: false,
        addFreshness: false,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(draftStore.save).toHaveBeenCalledWith(
      expect.objectContaining({
        draft: expect.objectContaining({
          nodes: [
            expect.objectContaining({
              metadata: expect.objectContaining({
                byteSize: 4096000,
                columns: [
                  { name: 'id', type: 'number', nullable: false, primaryKey: true, unique: true },
                ],
              }),
            }),
          ],
        }),
      })
    );
  });

  it('rejects impossible client-supplied source metadata before import', async () => {
    const { app, draftStore, workspaceFiles } = buildApp();
    const impossibleMetrics = [{ rowCount: -1 }, { byteSize: -1 }] as const;

    for (const metrics of impossibleMetrics) {
      const response = await app.inject({
        method: 'POST',
        url: `/workspace/sources/import?${SCOPE_QUERY}`,
        payload: {
          connectionId: 'warehouse-prod',
          tables: [
            {
              database: 'analytics',
              schema: 'erp',
              table: 'orders',
              ...metrics,
            },
          ],
          groupingStrategy: 'schema',
          includeColumns: true,
          addTests: false,
          addFreshness: false,
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({
        error: { type: 'bad_request', reason: 'invalid_body', target: 'body' },
      });
    }
    expect(workspaceFiles.saveFileContent).not.toHaveBeenCalled();
    expect(draftStore.save).not.toHaveBeenCalled();
  });

  it('scopes imported source identity by connection when warehouse objects share physical names', async () => {
    const { app, draftStore, workspaceFiles } = buildApp({
      catalogEntries: [
        {
          id: 'warehouse-prod',
          name: 'Production warehouse',
          type: 'postgres',
          database: 'analytics',
          tables: [{ database: 'analytics', schema: 'erp', table: 'orders' }],
        },
        {
          id: 'warehouse-sandbox',
          name: 'Sandbox warehouse',
          type: 'postgres',
          database: 'analytics',
          tables: [{ database: 'analytics', schema: 'erp', table: 'orders' }],
        },
      ],
    });

    const response = await app.inject({
      method: 'POST',
      url: `/workspace/sources/import?${SCOPE_QUERY}`,
      payload: {
        connectionId: 'warehouse-sandbox',
        tables: [{ database: 'analytics', schema: 'erp', table: 'orders' }],
        groupingStrategy: 'schema',
        includeColumns: false,
        addTests: false,
        addFreshness: false,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      sourcesCreated: 1,
      importedNodeIds: ['src_warehouse_sandbox_analytics_erp_orders'],
    });
    expect(workspaceFiles.saveFileContent).toHaveBeenCalledWith(
      'models/sources/src_erp.yml',
      expect.stringContaining('  - name: warehouse_sandbox_analytics_erp')
    );
    expect(draftStore.save).toHaveBeenCalledWith(
      expect.objectContaining({
        draft: expect.objectContaining({
          nodes: expect.arrayContaining([
            expect.objectContaining({
              id: 'src_warehouse_sandbox_analytics_erp_orders',
              metadata: expect.objectContaining({
                sourceName: 'warehouse_sandbox_analytics_erp',
              }),
            }),
          ]),
        }),
      })
    );
  });

  it('imports same schema and table name from different databases as distinct source nodes', async () => {
    const { app } = buildApp({
      catalogEntries: [
        {
          id: 'warehouse-prod',
          name: 'Production warehouse',
          type: 'postgres',
          database: 'analytics',
          tables: [
            {
              database: 'analytics',
              schema: 'erp',
              table: 'orders',
              columns: [{ name: 'id', type: 'number', nullable: false }],
            },
            {
              database: 'finance',
              schema: 'erp',
              table: 'orders',
              columns: [{ name: 'id', type: 'number', nullable: false }],
            },
          ],
        },
      ],
    });

    const response = await app.inject({
      method: 'POST',
      url: `/workspace/sources/import?${SCOPE_QUERY}`,
      payload: {
        connectionId: 'warehouse-prod',
        tables: [
          { database: 'analytics', schema: 'erp', table: 'orders' },
          { database: 'finance', schema: 'erp', table: 'orders' },
        ],
        groupingStrategy: 'database',
        includeColumns: true,
        addTests: false,
        addFreshness: false,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      success: true,
      sourcesCreated: 2,
      tablesImported: 2,
      yamlFiles: ['models/sources/src_analytics.yml', 'models/sources/src_finance.yml'],
      importedNodeIds: [
        'src_warehouse_prod_analytics_erp_orders',
        'src_warehouse_prod_finance_erp_orders',
      ],
      grouping: 'database',
    });
  });

  it('rejects unsupported custom grouping instead of importing with schema semantics', async () => {
    const { app, draftStore, workspaceFiles } = buildApp();

    const response = await app.inject({
      method: 'POST',
      url: `/workspace/sources/import?${SCOPE_QUERY}`,
      payload: {
        connectionId: 'warehouse-prod',
        tables: [{ database: 'analytics', schema: 'erp', table: 'orders' }],
        groupingStrategy: 'custom',
        includeColumns: true,
        addTests: false,
        addFreshness: false,
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: { type: 'bad_request', reason: 'invalid_body', target: 'body' },
    });
    expect(workspaceFiles.saveFileContent).not.toHaveBeenCalled();
    expect(draftStore.save).not.toHaveBeenCalled();
  });

  it('keeps schema-grouped YAML sources and imported node metadata distinct when database names disambiguate nodes', async () => {
    const { app, draftStore, workspaceFiles } = buildApp({
      catalogEntries: [
        {
          id: 'warehouse-prod',
          name: 'Production warehouse',
          type: 'postgres',
          database: 'analytics',
          tables: [
            {
              database: 'analytics',
              schema: 'erp',
              table: 'orders',
              columns: [{ name: 'id', type: 'number', nullable: false }],
            },
            {
              database: 'finance',
              schema: 'erp',
              table: 'orders',
              columns: [{ name: 'id', type: 'number', nullable: false }],
            },
          ],
        },
      ],
    });

    const response = await app.inject({
      method: 'POST',
      url: `/workspace/sources/import?${SCOPE_QUERY}`,
      payload: {
        connectionId: 'warehouse-prod',
        tables: [
          { database: 'analytics', schema: 'erp', table: 'orders' },
          { database: 'finance', schema: 'erp', table: 'orders' },
        ],
        groupingStrategy: 'schema',
        includeColumns: true,
        addTests: false,
        addFreshness: false,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      success: true,
      sourcesCreated: 2,
      tablesImported: 2,
      yamlFiles: ['models/sources/src_erp.yml'],
      importedNodeIds: [
        'src_warehouse_prod_analytics_erp_orders',
        'src_warehouse_prod_finance_erp_orders',
      ],
      grouping: 'schema',
    });
    expect(workspaceFiles.saveFileContent).toHaveBeenCalledWith(
      'models/sources/src_erp.yml',
      [
        'version: 2',
        '',
        'sources:',
        '  - name: warehouse_prod_analytics_erp',
        '    database: analytics',
        '    schema: erp',
        '    tables:',
        '      - name: orders',
        '        columns:',
        '          - name: id',
        '            data_type: number',
        '  - name: warehouse_prod_finance_erp',
        '    database: finance',
        '    schema: erp',
        '    tables:',
        '      - name: orders',
        '        columns:',
        '          - name: id',
        '            data_type: number',
        '',
      ].join('\n')
    );
    expect(draftStore.save).toHaveBeenCalledWith(
      expect.objectContaining({
        draft: expect.objectContaining({
          nodes: expect.arrayContaining([
            expect.objectContaining({
              id: 'src_warehouse_prod_analytics_erp_orders',
              metadata: expect.objectContaining({
                sourceName: 'warehouse_prod_analytics_erp',
                tableName: 'orders',
              }),
            }),
            expect.objectContaining({
              id: 'src_warehouse_prod_finance_erp_orders',
              metadata: expect.objectContaining({
                sourceName: 'warehouse_prod_finance_erp',
                tableName: 'orders',
              }),
            }),
          ]),
        }),
      })
    );
  });

  it('rejects unknown connections before import', async () => {
    const { app } = buildApp();

    const response = await app.inject({
      method: 'POST',
      url: `/workspace/sources/import?${SCOPE_QUERY}`,
      payload: {
        connectionId: 'missing',
        tables: [{ database: 'analytics', schema: 'erp', table: 'orders' }],
        groupingStrategy: 'schema',
        includeColumns: true,
        addTests: false,
        addFreshness: false,
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: { type: 'not_found', reason: 'warehouse_connection_not_found' },
    });
  });

  it('returns conflict when the authoritative draft changes during import', async () => {
    const { app } = buildApp({
      saveResult: {
        kind: 'conflict',
        currentRevision: 'rev-3',
        storedSchemaVersion: 'workspace-graph-draft.v1',
        updatedAt: '2026-05-30T00:00:02.000Z',
      },
    });

    const response = await app.inject({
      method: 'POST',
      url: `/workspace/sources/import?${SCOPE_QUERY}`,
      payload: {
        connectionId: 'warehouse-prod',
        tables: [{ database: 'analytics', schema: 'erp', table: 'orders' }],
        groupingStrategy: 'schema',
        includeColumns: true,
        addTests: false,
        addFreshness: false,
      },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      error: { type: 'conflict', reason: 'workspace_source_import_draft_conflict' },
    });
  });

  it('rejects malformed existing source YAML before mutating the draft', async () => {
    const { app, draftStore, workspaceFiles } = buildApp({
      existingSourceFileContent: 'version: 2\nsources:\n  - name: [',
    });

    const response = await app.inject({
      method: 'POST',
      url: `/workspace/sources/import?${SCOPE_QUERY}`,
      payload: {
        connectionId: 'warehouse-prod',
        tables: [{ database: 'analytics', schema: 'erp', table: 'orders' }],
        groupingStrategy: 'schema',
        includeColumns: true,
        addTests: false,
        addFreshness: false,
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: {
        type: 'bad_request',
        reason: 'invalid_workspace_source_yaml',
        target: 'workspace_file',
      },
    });
    expect(draftStore.save).not.toHaveBeenCalled();
    expect(workspaceFiles.saveFileContent).not.toHaveBeenCalled();
  });

  it('fails closed when the bearer token is missing', async () => {
    const { app } = buildApp({ authenticated: false });

    const response = await app.inject({
      method: 'GET',
      url: `/workspace/warehouse/connections?${SCOPE_QUERY}`,
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: { type: 'unauthorized', reason: 'missing_token' } });
  });

  it('fails closed when source import action is denied', async () => {
    const { app } = buildApp({ authorized: false });

    const response = await app.inject({
      method: 'GET',
      url: `/workspace/warehouse/connections?${SCOPE_QUERY}`,
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ error: { type: 'forbidden', reason: 'action_not_granted' } });
  });
});
