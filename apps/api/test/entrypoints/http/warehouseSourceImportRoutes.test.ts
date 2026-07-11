import { createHash } from 'node:crypto';

import {
  buildRelationalSourceObjectId,
  type SourceObject,
  type SourceObjectColumn,
  type SourceObjectConstraint,
  type SourceObjectMetricEvidence,
  type WorkspaceGraphDraftScope,
} from '@dvt/contracts';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import {
  DuplicateWarehouseConnectionError,
  WarehouseConnectionNotFoundError,
} from '../../../src/application/ports/warehouseSourceImport.js';
import type {
  CreateWarehouseConnectionCatalogInput,
  IWarehouseConnectionCatalog,
  IWarehouseConnectionProbe,
  InspectWarehouseConnectionResult,
  TestWarehouseConnectionResult,
  WarehouseConnection,
  WarehouseConnectionCatalogEntry,
} from '../../../src/application/ports/warehouseSourceImport.js';
import { WorkspaceFileNotFoundError } from '../../../src/application/ports/workspaceFiles.js';
import type {
  DeleteWorkspaceFileContentInput,
  IWorkspaceFileRepository,
  SaveWorkspaceFileContentInput,
  WorkspaceFileContent,
  WorkspaceFileDeleteResult,
  WorkspaceFileEntry,
  WorkspaceFileSaveResult,
  WorkspaceStorageScope,
} from '../../../src/application/ports/workspaceFiles.js';
import { CreateWarehouseConnectionUseCase } from '../../../src/application/services/createWarehouseConnectionUseCase.js';
import { ImportWarehouseSourcesUseCase } from '../../../src/application/services/importWarehouseSourcesUseCase.js';
import { ListWarehouseConnectionSourceObjectsUseCase } from '../../../src/application/services/listWarehouseConnectionSourceObjectsUseCase.js';
import { ListWarehouseConnectionsUseCase } from '../../../src/application/services/listWarehouseConnectionsUseCase.js';
import { TestWarehouseConnectionUseCase } from '../../../src/application/services/testWarehouseConnectionUseCase.js';
import { WarehouseConnectionSourceObjectReader } from '../../../src/application/services/WarehouseConnectionSourceObjectReader.js';
import { registerWarehouseSourceImportRoutes } from '../../../src/entrypoints/http/warehouseSourceImportRoutes.js';
import {
  WORKSPACE_WAREHOUSE_CONNECTION_CATALOG_PATH,
  toWarehouseConnectionId,
} from '../../../src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.js';

const SCOPE_QUERY = 'tenantId=tenant-a&projectId=project-a&environmentId=env-a';
const ROUTE_SCOPE = {
  tenantId: 'tenant-a',
  projectId: 'project-a',
  environmentId: 'env-a',
} as const satisfies WorkspaceGraphDraftScope;

function measuredMetrics(rowCount: number, byteSize: number): SourceObjectMetricEvidence {
  return {
    observedAt: '2026-07-10T21:00:00.000Z',
    observationScope: { kind: 'snapshot' },
    rowCount: {
      value: rowCount,
      provenance: 'estimated',
      method: 'provider-statistics',
      confidence: 'medium',
    },
    byteSize: {
      value: byteSize,
      provenance: 'measured',
      method: 'provider-storage-metadata',
      confidence: 'exact',
      basis: 'physical-allocation',
    },
  };
}

function relationSourceObject(
  input: Readonly<{
    catalog?: string;
    schema?: string;
    name?: string;
    rowCount?: number;
    byteSize?: number;
    columns?: readonly SourceObjectColumn[];
    constraints?: readonly SourceObjectConstraint[];
  }> = {}
): SourceObject {
  const locator = {
    kind: 'relation' as const,
    catalog: input.catalog ?? 'analytics',
    schema: input.schema ?? 'erp',
    name: input.name ?? 'orders',
    relationType: 'table' as const,
  };
  return {
    objectId: buildRelationalSourceObjectId(locator),
    displayName: locator.name,
    locator,
    metricEvidence: measuredMetrics(input.rowCount ?? 42, input.byteSize ?? 4096000),
    ...(input.columns ? { columns: [...input.columns] } : {}),
    ...(input.constraints ? { constraints: [...input.constraints] } : {}),
  };
}

const defaultOrdersSourceObject = relationSourceObject({
  columns: [{ name: 'id', type: 'number', nullable: false }],
  constraints: [{ name: 'orders_pkey', kind: 'primary-key', columns: ['id'] }],
});

class TestWarehouseConnectionCatalog implements IWarehouseConnectionCatalog {
  private readonly entriesByScope = new Map<string, readonly WarehouseConnectionCatalogEntry[]>();

  public constructor(
    entries: readonly WarehouseConnectionCatalogEntry[],
    private readonly saveConnection?: (
      scope: WorkspaceGraphDraftScope,
      input: CreateWarehouseConnectionCatalogInput,
      entries: readonly WarehouseConnectionCatalogEntry[]
    ) => Promise<void>
  ) {
    this.entriesByScope.set(scopeKey(ROUTE_SCOPE), entries);
  }

  public async listConnections(
    scope: WorkspaceGraphDraftScope
  ): Promise<readonly WarehouseConnection[]> {
    return this.entries(scope).map(
      ({ sourceObjects: _sourceObjects, credentialRef: _credentialRef, ...connection }) =>
        connection
    );
  }

  public async listSourceObjects(
    scope: WorkspaceGraphDraftScope,
    connectionId: string
  ): Promise<readonly SourceObject[]> {
    return (await this.getConnection(scope, connectionId)).sourceObjects;
  }

  public async getConnection(
    scope: WorkspaceGraphDraftScope,
    connectionId: string
  ): Promise<WarehouseConnectionCatalogEntry> {
    const connection = this.entries(scope).find((entry) => entry.id === connectionId);
    if (!connection) {
      throw new WarehouseConnectionNotFoundError(connectionId);
    }

    return connection;
  }

  public async createConnection(
    scope: WorkspaceGraphDraftScope,
    input: CreateWarehouseConnectionCatalogInput
  ): Promise<WarehouseConnection> {
    const entries = this.entries(scope);
    const id = toWarehouseConnectionId(input.name);
    const duplicate = entries.some(
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
      sourceObjects: input.sourceObjects,
    };
    const nextEntries = [...entries, entry];
    this.entriesByScope.set(scopeKey(scope), nextEntries);
    await this.saveConnection?.(scope, input, nextEntries);
    const { sourceObjects: _sourceObjects, credentialRef: _credentialRef, ...connection } = entry;
    return connection;
  }

  private entries(scope: WorkspaceGraphDraftScope): readonly WarehouseConnectionCatalogEntry[] {
    return this.entriesByScope.get(scopeKey(scope)) ?? [];
  }
}

function scopeKey(scope: WorkspaceGraphDraftScope): string {
  return `${scope.tenantId}\u0000${scope.projectId}\u0000${scope.environmentId}`;
}

type TestWarehouseConnectionProbeFailure = Omit<
  Extract<InspectWarehouseConnectionResult, { readonly status: 'failed' }>,
  'checkedAt'
> & {
  readonly checkedAt?: string;
};

class TestWarehouseConnectionProbe implements IWarehouseConnectionProbe {
  public constructor(
    private readonly result: TestWarehouseConnectionProbeFailure | null,
    private readonly resolveSourceObjects: (
      input: Parameters<IWarehouseConnectionProbe['inspectConnection']>[0]
    ) => readonly SourceObject[]
  ) {}

  public async inspectConnection(
    _input: Parameters<IWarehouseConnectionProbe['inspectConnection']>[0]
  ): Promise<InspectWarehouseConnectionResult> {
    if (this.result) {
      return { ...this.result, checkedAt: this.result.checkedAt ?? '2026-05-30T00:00:01.000Z' };
    }

    return {
      status: 'passed',
      checkedAt: '2026-05-30T00:00:01.000Z',
      sourceObjects: this.resolveSourceObjects(_input),
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
      objectCount: input.sourceObjects.length,
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
    readonly deleteFileContent: ReturnType<typeof vi.fn>;
  };
} {
  const app = Fastify({ logger: false });
  const catalogEntries = (
    options.catalogEntries ?? [
      {
        id: 'warehouse-prod',
        name: 'Production warehouse',
        type: 'postgres',
        database: 'analytics',
        credentialRef: 'env:DVT_WAREHOUSE_URL',
        sourceObjects: [defaultOrdersSourceObject],
      },
    ]
  ).map((entry) => ({
    credentialRef: entry.credentialRef ?? `env:DVT_${entry.id.toUpperCase()}_URL`,
    ...entry,
  }));
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
    listFiles: vi
      .fn<(scope: WorkspaceStorageScope) => Promise<readonly WorkspaceFileEntry[]>>()
      .mockResolvedValue([]),
    getFileContent: vi
      .fn<(scope: WorkspaceStorageScope, path: string) => Promise<WorkspaceFileContent>>()
      .mockImplementation(async (_scope, path) => {
        if (options.existingSourceFileContent !== undefined) {
          return {
            path,
            name: path.split('/').at(-1) ?? path,
            language: 'yaml',
            content: options.existingSourceFileContent,
            contentSha256: sha256(options.existingSourceFileContent),
            lastModified: '2026-05-30T00:00:00.000Z',
          };
        }
        throw new WorkspaceFileNotFoundError('models/sources/src_erp.yml');
      }),
    saveFileContent: vi.fn<
      (
        scope: WorkspaceStorageScope,
        input: SaveWorkspaceFileContentInput
      ) => Promise<WorkspaceFileSaveResult>
    >(async (_scope, input) => ({
      kind: 'saved',
      disposition: 'created',
      path: input.path,
      contentSha256: sha256(input.content),
      lastModified: '2026-05-30T00:00:01.000Z',
    })),
    deleteFileContent: vi.fn<
      (
        scope: WorkspaceStorageScope,
        input: DeleteWorkspaceFileContentInput
      ) => Promise<WorkspaceFileDeleteResult>
    >(async (_scope, _input) => ({ kind: 'deleted' })),
  };
  const catalog = new TestWarehouseConnectionCatalog(
    catalogEntries,
    async (scope, _input, entries) => {
      await workspaceFiles.saveFileContent(scope, {
        path: WORKSPACE_WAREHOUSE_CONNECTION_CATALOG_PATH,
        content: JSON.stringify({ connections: entries }, null, 2),
        expectedRevision: { kind: 'absent' },
      });
    }
  );
  const probe = new TestWarehouseConnectionProbe(
    options.connectionTestResult ?? null,
    (input) =>
      catalogEntries.find((entry) => entry.credentialRef === input.credentialRef)
        ?.sourceObjects ?? [relationSourceObject({ catalog: input.database, schema: 'public' })]
  );
  const sourceObjectReader = new WarehouseConnectionSourceObjectReader(catalog, probe);
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
    listSourceObjectsUseCase: new ListWarehouseConnectionSourceObjectsUseCase(sourceObjectReader),
    createConnectionUseCase: new CreateWarehouseConnectionUseCase(catalog, probe),
    testConnectionUseCase: new TestWarehouseConnectionUseCase(catalog, probe),
    importSourcesUseCase: new ImportWarehouseSourcesUseCase(
      sourceObjectReader,
      draftStore as never,
      workspaceFiles as IWorkspaceFileRepository,
      () => new Date('2026-05-30T00:00:01.000Z')
    ),
    rateLimit: { max: 100, timeWindow: 60_000 },
  });

  return { app, authorize, draftStore, workspaceFiles };
}

function sha256(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
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
      ROUTE_SCOPE,
      expect.objectContaining({
        path: '.dvt/warehouse-connections.json',
        content: expect.not.stringContaining('DVT_FINANCE_WAREHOUSE_URL='),
        expectedRevision: { kind: 'absent' },
      })
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
      objectCount: 1,
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

  it('does not return another workspace scope connection catalog', async () => {
    const { app } = buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/workspace/warehouse/connections?tenantId=tenant-a&projectId=project-a&environmentId=env-b',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([]);
  });

  it('lists source objects for a known connection', async () => {
    const { app } = buildApp();

    const response = await app.inject({
      method: 'GET',
      url: `/workspace/warehouse/connections/warehouse-prod/objects?${SCOPE_QUERY}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      contractVersion: 1,
      objects: [defaultOrdersSourceObject],
    });
  });

  it('rejects duplicate source-object selections before command side effects', async () => {
    const { app, draftStore, workspaceFiles } = buildApp();

    const response = await app.inject({
      method: 'POST',
      url: `/workspace/sources/import?${SCOPE_QUERY}`,
      payload: {
        connectionId: 'warehouse-prod',
        objects: [
          { objectId: defaultOrdersSourceObject.objectId },
          { objectId: defaultOrdersSourceObject.objectId },
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
    expect(workspaceFiles.saveFileContent).not.toHaveBeenCalled();
    expect(draftStore.save).not.toHaveBeenCalled();
  });

  it('imports selected source objects into the authoritative workspace graph draft', async () => {
    const { app, authorize, workspaceFiles } = buildApp();

    const response = await app.inject({
      method: 'POST',
      url: `/workspace/sources/import?${SCOPE_QUERY}`,
      payload: {
        connectionId: 'warehouse-prod',
        objects: [{ objectId: defaultOrdersSourceObject.objectId }],
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
      objectsImported: 1,
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
      ROUTE_SCOPE,
      expect.objectContaining({
        path: 'models/sources/src_erp.yml',
        content: [
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
        ].join('\n'),
        expectedRevision: { kind: 'absent' },
      })
    );
  });

  it('hydrates identity-only import requests from catalog-owned metadata', async () => {
    const { app, draftStore } = buildApp();

    const response = await app.inject({
      method: 'POST',
      url: `/workspace/sources/import?${SCOPE_QUERY}`,
      payload: {
        connectionId: 'warehouse-prod',
        objects: [{ objectId: defaultOrdersSourceObject.objectId }],
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
                sourceMetricEvidence: measuredMetrics(42, 4096000),
                columns: [{ name: 'id', type: 'number', nullable: false }],
              }),
            }),
          ],
        }),
      })
    );
  });

  it('rejects client-supplied source metrics before import', async () => {
    const { app, draftStore, workspaceFiles } = buildApp();
    const impossibleMetrics = [
      { rowCount: -1 },
      { byteSize: -1 },
      { estimatedByteSize: -1 },
    ] as const;

    for (const metrics of impossibleMetrics) {
      const response = await app.inject({
        method: 'POST',
        url: `/workspace/sources/import?${SCOPE_QUERY}`,
        payload: {
          connectionId: 'warehouse-prod',
          objects: [{ objectId: defaultOrdersSourceObject.objectId, ...metrics }],
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
          sourceObjects: [relationSourceObject()],
        },
        {
          id: 'warehouse-sandbox',
          name: 'Sandbox warehouse',
          type: 'postgres',
          database: 'analytics',
          sourceObjects: [relationSourceObject()],
        },
      ],
    });

    const response = await app.inject({
      method: 'POST',
      url: `/workspace/sources/import?${SCOPE_QUERY}`,
      payload: {
        connectionId: 'warehouse-sandbox',
        objects: [{ objectId: defaultOrdersSourceObject.objectId }],
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
      ROUTE_SCOPE,
      expect.objectContaining({
        path: 'models/sources/src_erp.yml',
        content: expect.stringContaining('  - name: warehouse_sandbox_analytics_erp'),
        expectedRevision: { kind: 'absent' },
      })
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
          sourceObjects: [
            relationSourceObject({
              catalog: 'analytics',
              columns: [{ name: 'id', type: 'number', nullable: false }],
            }),
            relationSourceObject({
              catalog: 'finance',
              rowCount: 24,
              byteSize: 2048000,
              columns: [{ name: 'id', type: 'number', nullable: false }],
            }),
          ],
        },
      ],
    });

    const response = await app.inject({
      method: 'POST',
      url: `/workspace/sources/import?${SCOPE_QUERY}`,
      payload: {
        connectionId: 'warehouse-prod',
        objects: [
          { objectId: relationSourceObject({ catalog: 'analytics' }).objectId },
          { objectId: relationSourceObject({ catalog: 'finance' }).objectId },
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
      objectsImported: 2,
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
        objects: [{ objectId: defaultOrdersSourceObject.objectId }],
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
          sourceObjects: [
            relationSourceObject({
              catalog: 'analytics',
              columns: [{ name: 'id', type: 'number', nullable: false }],
            }),
            relationSourceObject({
              catalog: 'finance',
              rowCount: 24,
              byteSize: 2048000,
              columns: [{ name: 'id', type: 'number', nullable: false }],
            }),
          ],
        },
      ],
    });

    const response = await app.inject({
      method: 'POST',
      url: `/workspace/sources/import?${SCOPE_QUERY}`,
      payload: {
        connectionId: 'warehouse-prod',
        objects: [
          { objectId: relationSourceObject({ catalog: 'analytics' }).objectId },
          { objectId: relationSourceObject({ catalog: 'finance' }).objectId },
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
      objectsImported: 2,
      yamlFiles: ['models/sources/src_erp.yml'],
      importedNodeIds: [
        'src_warehouse_prod_analytics_erp_orders',
        'src_warehouse_prod_finance_erp_orders',
      ],
      grouping: 'schema',
    });
    expect(workspaceFiles.saveFileContent).toHaveBeenCalledWith(
      ROUTE_SCOPE,
      expect.objectContaining({
        path: 'models/sources/src_erp.yml',
        content: [
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
        ].join('\n'),
        expectedRevision: { kind: 'absent' },
      })
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
        objects: [{ objectId: defaultOrdersSourceObject.objectId }],
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
        objects: [{ objectId: defaultOrdersSourceObject.objectId }],
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
        objects: [{ objectId: defaultOrdersSourceObject.objectId }],
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
