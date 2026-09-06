import { createHash } from 'node:crypto';

import {
  buildRelationalSourceObjectId,
  type CanvasAuthoringAuthorityBinding,
  type SourceObject,
  type SourceObjectColumn,
  type SourceObjectConstraint,
  type SourceObjectMetricEvidence,
  type WorkspaceGraphDraftScope,
  type WorkspaceGraphAuthoringNode,
} from '@dvt/contracts';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import type { CanvasAuthoringAuthorityKey } from '../../../src/application/ports/canvasAuthoringAuthority.js';
import {
  DuplicateWarehouseConnectionError,
  WarehouseConnectionNotFoundError,
} from '../../../src/application/ports/warehouseSourceImport.js';
import type {
  CreateWarehouseConnectionCatalogInput,
  IWarehouseConnectionCatalog,
  IWarehouseConnectionProbe,
  IWarehouseSourceDataSampleProbe,
  InspectWarehouseConnectionResult,
  TestWarehouseConnectionResult,
  WarehouseConnection,
  WarehouseConnectionCatalogEntry,
} from '../../../src/application/ports/warehouseSourceImport.js';
import {
  WorkspaceFileNotFoundError,
  WorkspaceFileRevisionConflictError,
} from '../../../src/application/ports/workspaceFiles.js';
import type {
  DeleteWorkspaceFileContentInput,
  IWorkspaceFileBatchMutationPort,
  SaveWorkspaceFileContentInput,
  WorkspaceFileBatchMutation,
  WorkspaceFileBatchMutationResult,
  WorkspaceFileContent,
  WorkspaceFileDeleteResult,
  WorkspaceFileEntry,
  WorkspaceFileSaveResult,
  WorkspaceStorageScope,
} from '../../../src/application/ports/workspaceFiles.js';
import { CreateWarehouseConnectionUseCase } from '../../../src/application/services/createWarehouseConnectionUseCase.js';
import { GraphDraftWarehouseSourceImportStrategy } from '../../../src/application/services/graphDraftWarehouseSourceImportStrategy.js';
import { ImportWarehouseSourcesUseCase } from '../../../src/application/services/importWarehouseSourcesUseCase.js';
import { ListWarehouseConnectionSourceObjectsUseCase } from '../../../src/application/services/listWarehouseConnectionSourceObjectsUseCase.js';
import { ListWarehouseConnectionsUseCase } from '../../../src/application/services/listWarehouseConnectionsUseCase.js';
import { PreviewWarehouseSourceObjectRowsUseCase } from '../../../src/application/services/previewWarehouseSourceObjectRowsUseCase.js';
import { RenameWarehouseConnectionUseCase } from '../../../src/application/services/renameWarehouseConnectionUseCase.js';
import { TestWarehouseConnectionUseCase } from '../../../src/application/services/testWarehouseConnectionUseCase.js';
import { ValidatePostgresTransformSqlUseCase } from '../../../src/application/services/validatePostgresTransformSqlUseCase.js';
import { WarehouseConnectionSourceObjectReader } from '../../../src/application/services/WarehouseConnectionSourceObjectReader.js';
import { registerWarehouseSourceImportRoutes } from '../../../src/entrypoints/http/warehouseSourceImportRoutes.js';
import {
  WORKSPACE_WAREHOUSE_CONNECTION_CATALOG_PATH,
  toWarehouseConnectionId,
} from '../../../src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.js';

const SCOPE_QUERY = 'tenantId=tenant-a&projectId=project-a&environmentId=env-a';
const DVT_SOURCE_NODE_ID_PATTERN =
  /^dvt_src_[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;

const ROUTE_SCOPE = {
  tenantId: 'tenant-a',
  projectId: 'project-a',
  environmentId: 'env-a',
} as const satisfies WorkspaceGraphDraftScope;
const SOURCE_IMPORT_REQUEST_BASE = {
  schemaVersion: 'source-import-request.v2',
  canvasId: 'canvas-a',
  idempotencyKey: 'source-import-route-test',
} as const;

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

  public async renameConnection(
    scope: WorkspaceGraphDraftScope,
    connectionId: string,
    input: { readonly name: string }
  ): Promise<WarehouseConnection> {
    const entries = this.entries(scope);
    const currentIndex = entries.findIndex((entry) => entry.id === connectionId);
    if (currentIndex < 0) throw new WarehouseConnectionNotFoundError(connectionId);
    if (
      entries.some(
        (entry, index) =>
          index !== currentIndex &&
          entry.name.trim().toLowerCase() === input.name.trim().toLowerCase()
      )
    ) {
      throw new DuplicateWarehouseConnectionError(input.name);
    }
    const current = entries[currentIndex];
    if (!current) throw new WarehouseConnectionNotFoundError(connectionId);
    const renamed = { ...current, name: input.name.trim() };
    const nextEntries = [...entries];
    nextEntries[currentIndex] = renamed;
    this.entriesByScope.set(scopeKey(scope), nextEntries);
    const { sourceObjects: _sourceObjects, credentialRef: _credentialRef, ...connection } = renamed;
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

class TestWarehouseConnectionProbe
  implements IWarehouseConnectionProbe, IWarehouseSourceDataSampleProbe
{
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

  public async previewSourceObjectRows(
    input: Parameters<IWarehouseSourceDataSampleProbe['previewSourceObjectRows']>[0]
  ): ReturnType<IWarehouseSourceDataSampleProbe['previewSourceObjectRows']> {
    return {
      columns: [
        { name: 'order_id', type: 'integer', nullable: false },
        { name: 'customer', type: 'text', nullable: true },
      ],
      rows: [{ values: ['1', 'Ada'] }, { values: ['2', null] }].slice(0, input.limit),
      truncated: input.limit < 2,
      sampledAt: '2026-08-17T10:00:00.000Z',
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
        }
      | {
          readonly kind: 'idempotency_mismatch';
        };
    readonly existingSourceFileContent?: string;
    readonly connectionTestResult?: TestWarehouseConnectionProbeFailure;
    readonly renameError?: Error;
    readonly sqlValidationResult?:
      | { readonly status: 'valid' }
      | {
          readonly status: 'invalid' | 'unavailable';
          readonly diagnostics: readonly {
            readonly code: 'undefined_column' | 'connection_unavailable';
            readonly source: 'postgres' | 'connection';
            readonly message: string;
          }[];
        };
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
  readonly validateSql: ReturnType<typeof vi.fn>;
} {
  const app = Fastify({ logger: false });
  const catalogEntries = (
    options.catalogEntries ?? [
      {
        id: 'warehouse-prod',
        name: 'Production warehouse',
        type: 'postgres',
        database: 'analytics',
        credentialRef: 'postgres:warehouse',
        sourceObjects: [defaultOrdersSourceObject],
      },
    ]
  ).map((entry) => ({
    credentialRef: entry.credentialRef ?? `postgres:${entry.id}`,
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
  const batchMutation: IWorkspaceFileBatchMutationPort = {
    apply: vi.fn(
      async (
        scope: WorkspaceStorageScope,
        mutation: WorkspaceFileBatchMutation
      ): Promise<WorkspaceFileBatchMutationResult> => {
        const writes: { path: string; contentSha256: string }[] = [];
        for (const write of mutation.writes) {
          const expected = mutation.expectedFiles.find(
            (candidate) => candidate.path === write.path
          );
          const result = await workspaceFiles.saveFileContent(scope, {
            path: write.path,
            content: write.content,
            expectedRevision: expected?.expectedContentSha256
              ? { kind: 'content_sha256', value: expected.expectedContentSha256 }
              : { kind: 'absent' },
          });
          if (result.kind === 'conflict') {
            return {
              kind: 'conflict',
              conflicts: [{ path: write.path, currentContentSha256: result.currentContentSha256 }],
            };
          }
          writes.push({ path: write.path, contentSha256: result.contentSha256 });
        }
        for (const filePath of mutation.deletes) {
          const expected = mutation.expectedFiles.find(
            (candidate) => candidate.path === filePath
          )?.expectedContentSha256;
          if (!expected) throw new Error(`Missing rollback revision for ${filePath}`);
          await workspaceFiles.deleteFileContent(scope, {
            path: filePath,
            expectedRevision: { kind: 'content_sha256', value: expected },
          });
        }
        return {
          kind: 'applied',
          idempotencyKey: mutation.idempotencyKey,
          requestHash: sha256(JSON.stringify(mutation)),
          deduplicated: false,
          writes,
          deletes: [...mutation.deletes],
        };
      }
    ),
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
  if (options.renameError) {
    vi.spyOn(catalog, 'renameConnection').mockRejectedValue(options.renameError);
  }
  const probe = new TestWarehouseConnectionProbe(
    options.connectionTestResult ?? null,
    (input) =>
      catalogEntries.find((entry) => entry.credentialRef === input.credentialRef)
        ?.sourceObjects ?? [relationSourceObject({ catalog: input.database, schema: 'public' })]
  );
  const sourceObjectReader = new WarehouseConnectionSourceObjectReader(catalog, probe);
  const validateSql = vi.fn().mockResolvedValue(options.sqlValidationResult ?? { status: 'valid' });
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
    previewSourceRowsUseCase: new PreviewWarehouseSourceObjectRowsUseCase(catalog, probe),
    createConnectionUseCase: new CreateWarehouseConnectionUseCase(catalog, probe),
    renameConnectionUseCase: new RenameWarehouseConnectionUseCase(catalog),
    testConnectionUseCase: new TestWarehouseConnectionUseCase(catalog, probe),
    validatePostgresTransformSqlUseCase: new ValidatePostgresTransformSqlUseCase({
      catalog,
      semanticValidator: { validate: validateSql },
    }),
    importSourcesUseCase: new ImportWarehouseSourcesUseCase({
      sourceObjectReader,
      authorityPolicy: {
        resolve: vi.fn(
          async (key: CanvasAuthoringAuthorityKey): Promise<CanvasAuthoringAuthorityBinding> => ({
            schemaVersion: 'canvas-authoring-authority-binding.v1',
            canvasId: key.canvasId,
            authority: { kind: 'graph-draft' },
          })
        ),
      },
      graphDraftStrategy: new GraphDraftWarehouseSourceImportStrategy({
        draftStore: draftStore as never,
        workspaceFiles,
        batchMutation,
        now: () => new Date('2026-05-30T00:00:01.000Z'),
      }),
      dbtProjectFilesStrategy: { execute: vi.fn() },
    }),
    rateLimit: { max: 100, timeWindow: 60_000 },
  });

  return { app, authorize, draftStore, workspaceFiles, validateSql };
}

function sha256(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

describe('warehouseSourceImportRoutes', () => {
  it('validates current SQL through the protected governed PostgreSQL rail', async () => {
    const { app, validateSql } = buildApp();

    const response = await app.inject({
      method: 'POST',
      url: `/workspace/warehouse/sql-validation?${SCOPE_QUERY}`,
      payload: {
        connectionRef: {
          schemaVersion: 'connection-ref.v1',
          provider: 'postgres',
          connectionId: 'warehouse-prod',
        },
        sql: 'select * from public.orders',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'valid' });
    expect(validateSql).toHaveBeenCalledWith({
      credentialRef: 'postgres:warehouse',
      sql: ['SELECT *', 'FROM public.orders'].join('\n'),
    });
  });

  it('returns a bounded source data sample through the protected view query', async () => {
    const { app, authorize } = buildApp();
    const objectId = encodeURIComponent('relation/analytics/erp/orders');

    const response = await app.inject({
      method: 'GET',
      url: `/workspace/warehouse/connections/warehouse-prod/source-data-sample?${SCOPE_QUERY}&objectId=${objectId}&limit=1`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      contractVersion: 1,
      connectionId: 'warehouse-prod',
      objectId: 'relation/analytics/erp/orders',
      columns: [
        { name: 'order_id', type: 'integer', nullable: false },
        { name: 'customer', type: 'text', nullable: true },
      ],
      rows: [{ values: ['1', 'Ada'] }],
      limit: 1,
      truncated: true,
      sampledAt: '2026-08-17T10:00:00.000Z',
    });
    expect(response.json()).not.toHaveProperty('credentialRef');
    expect(authorize).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: { kind: 'query', name: 'workspace:source-import:view' },
      }),
      expect.any(String)
    );
  });

  it('rejects missing object identity and limits above the governed source sample bound', async () => {
    const { app } = buildApp();
    const missingObject = await app.inject({
      method: 'GET',
      url: `/workspace/warehouse/connections/warehouse-prod/source-data-sample?${SCOPE_QUERY}`,
    });
    const outOfRange = await app.inject({
      method: 'GET',
      url: `/workspace/warehouse/connections/warehouse-prod/source-data-sample?${SCOPE_QUERY}&objectId=${encodeURIComponent('relation/analytics/erp/orders')}&limit=51`,
    });

    expect(missingObject.statusCode).toBe(400);
    expect(outOfRange.statusCode).toBe(400);
  });

  it('does not collapse an unknown governed connection into a generic sample failure', async () => {
    const { app } = buildApp();
    const response = await app.inject({
      method: 'GET',
      url: `/workspace/warehouse/connections/missing/source-data-sample?${SCOPE_QUERY}&objectId=${encodeURIComponent('relation/analytics/erp/orders')}`,
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: { type: 'not_found', reason: 'warehouse_connection_not_found' },
    });
  });

  it('renames a warehouse connection through a dedicated protected command rail', async () => {
    const { app, authorize } = buildApp();

    const response = await app.inject({
      method: 'PATCH',
      url: `/workspace/warehouse/connections/warehouse-prod?${SCOPE_QUERY}`,
      payload: { name: 'Finance warehouse' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      id: 'warehouse-prod',
      name: 'Finance warehouse',
      type: 'postgres',
      database: 'analytics',
    });
    expect(authorize).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: { kind: 'command', name: 'workspace:source-connection:rename' },
      }),
      expect.any(String)
    );
  });

  it('returns explicit errors for invalid, duplicate, and unknown connection renames', async () => {
    const duplicate = buildApp({
      catalogEntries: [
        {
          id: 'warehouse-prod',
          name: 'Production warehouse',
          type: 'postgres',
          database: 'analytics',
          credentialRef: 'env:DVT_WAREHOUSE_URL',
          sourceObjects: [defaultOrdersSourceObject],
        },
        {
          id: 'finance-prod',
          name: 'Finance warehouse',
          type: 'postgres',
          database: 'finance',
          credentialRef: 'env:DVT_FINANCE_WAREHOUSE_URL',
          sourceObjects: [],
        },
      ],
    });

    const invalidResponse = await duplicate.app.inject({
      method: 'PATCH',
      url: `/workspace/warehouse/connections/warehouse-prod?${SCOPE_QUERY}`,
      payload: { name: '   ' },
    });
    expect(invalidResponse.statusCode).toBe(400);

    const duplicateResponse = await duplicate.app.inject({
      method: 'PATCH',
      url: `/workspace/warehouse/connections/warehouse-prod?${SCOPE_QUERY}`,
      payload: { name: ' FINANCE WAREHOUSE ' },
    });
    expect(duplicateResponse.statusCode).toBe(409);
    expect(duplicateResponse.json()).toEqual({
      error: { type: 'conflict', reason: 'warehouse_connection_duplicate' },
    });

    const missingResponse = await duplicate.app.inject({
      method: 'PATCH',
      url: `/workspace/warehouse/connections/missing?${SCOPE_QUERY}`,
      payload: { name: 'Missing connection' },
    });
    expect(missingResponse.statusCode).toBe(404);
    expect(missingResponse.json()).toEqual({
      error: { type: 'not_found', reason: 'warehouse_connection_not_found' },
    });
  });

  it('fails the rename command closed without authentication or its dedicated grant', async () => {
    const unauthenticated = buildApp({ authenticated: false });
    const missingTokenResponse = await unauthenticated.app.inject({
      method: 'PATCH',
      url: `/workspace/warehouse/connections/warehouse-prod?${SCOPE_QUERY}`,
      payload: { name: 'Finance warehouse' },
    });

    expect(missingTokenResponse.statusCode).toBe(401);
    expect(missingTokenResponse.json()).toEqual({
      error: { type: 'unauthorized', reason: 'missing_token' },
    });
    expect(unauthenticated.authorize).not.toHaveBeenCalled();

    const denied = buildApp({ authorized: false });
    const deniedResponse = await denied.app.inject({
      method: 'PATCH',
      url: `/workspace/warehouse/connections/warehouse-prod?${SCOPE_QUERY}`,
      payload: { name: 'Finance warehouse' },
    });

    expect(deniedResponse.statusCode).toBe(403);
    expect(deniedResponse.json()).toEqual({
      error: { type: 'forbidden', reason: 'action_not_granted' },
    });
    expect(denied.authorize).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: { kind: 'command', name: 'workspace:source-connection:rename' },
      }),
      expect.any(String)
    );
  });

  it('returns an explicit conflict when the rename loses its catalog revision race', async () => {
    const { app } = buildApp({
      renameError: new WorkspaceFileRevisionConflictError(
        WORKSPACE_WAREHOUSE_CONNECTION_CATALOG_PATH,
        'changed-revision'
      ),
    });

    const response = await app.inject({
      method: 'PATCH',
      url: `/workspace/warehouse/connections/warehouse-prod?${SCOPE_QUERY}`,
      payload: { name: 'Finance warehouse' },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      error: { type: 'conflict', reason: 'workspace_file_revision_conflict' },
    });
  });

  it('creates a warehouse connection through the protected command rail before listing it', async () => {
    const { app, authorize, workspaceFiles } = buildApp({ catalogEntries: [] });

    const response = await app.inject({
      method: 'POST',
      url: `/workspace/warehouse/connections?${SCOPE_QUERY}`,
      payload: {
        name: 'Finance warehouse',
        type: 'postgres',
        database: 'finance',
        credentialRef: 'postgres:finance-warehouse',
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

  it('identifies an invalid PostgreSQL credential reference before command side effects', async () => {
    const { app, workspaceFiles } = buildApp({ catalogEntries: [] });

    const response = await app.inject({
      method: 'POST',
      url: `/workspace/warehouse/connections?${SCOPE_QUERY}`,
      payload: {
        name: 'Unsafe inline URL',
        type: 'postgres',
        database: 'finance',
        credentialRef: 'postgresql://user:password@localhost:5432/finance',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: {
        type: 'bad_request',
        reason: 'invalid_credential_reference',
        target: 'credentialRef',
      },
    });
    expect(workspaceFiles.saveFileContent).not.toHaveBeenCalled();
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
        credentialRef: 'postgres:duplicate-warehouse',
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
        credentialRef: 'postgres:mysql-warehouse',
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
        credentialRef: 'postgres:finance-warehouse',
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
        ...SOURCE_IMPORT_REQUEST_BASE,
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

  it('requires the V2 idempotency key before command side effects', async () => {
    const { app, draftStore, workspaceFiles } = buildApp();

    const response = await app.inject({
      method: 'POST',
      url: `/workspace/sources/import?${SCOPE_QUERY}`,
      payload: {
        ...SOURCE_IMPORT_REQUEST_BASE,
        idempotencyKey: undefined,
        connectionId: 'warehouse-prod',
        objects: [{ objectId: defaultOrdersSourceObject.objectId }],
        groupingStrategy: 'schema',
        includeColumns: true,
        addTests: false,
        addFreshness: false,
      },
    });

    expect(response.statusCode).toBe(400);
    expect(workspaceFiles.saveFileContent).not.toHaveBeenCalled();
    expect(draftStore.save).not.toHaveBeenCalled();
  });

  it('imports selected source objects into the authoritative workspace graph draft', async () => {
    const { app, authorize, workspaceFiles, draftStore } = buildApp();

    const response = await app.inject({
      method: 'POST',
      url: `/workspace/sources/import?${SCOPE_QUERY}`,
      payload: {
        ...SOURCE_IMPORT_REQUEST_BASE,
        connectionId: 'warehouse-prod',
        objects: [{ objectId: defaultOrdersSourceObject.objectId }],
        groupingStrategy: 'schema',
        includeColumns: true,
        addTests: false,
        addFreshness: false,
      },
    });

    expect(response.statusCode).toBe(200);
    const importedNodeIds = vi
      .mocked(draftStore.save)
      .mock.calls[0]![0].draft.nodes.map((node: WorkspaceGraphAuthoringNode) => node.id);
    expect(importedNodeIds).toHaveLength(1);
    expect(new Set(importedNodeIds).size).toBe(1);
    for (const nodeId of importedNodeIds) expect(nodeId).toMatch(DVT_SOURCE_NODE_ID_PATTERN);
    expect(response.json()).toMatchObject({
      success: true,
      schemaVersion: 'source-import-result.v2',
      sourcesCreated: 1,
      objectsImported: 1,
      yamlFiles: ['models/sources/src_erp.yml'],
      outcome: {
        kind: 'graph-draft',
        draftRevision: 'rev-2',
        importedNodeIds,
      },
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
        ...SOURCE_IMPORT_REQUEST_BASE,
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
          ...SOURCE_IMPORT_REQUEST_BASE,
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

  it('persists opaque source identity independently from the selected physical connection', async () => {
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
        ...SOURCE_IMPORT_REQUEST_BASE,
        connectionId: 'warehouse-sandbox',
        objects: [{ objectId: defaultOrdersSourceObject.objectId }],
        groupingStrategy: 'schema',
        includeColumns: false,
        addTests: false,
        addFreshness: false,
      },
    });

    expect(response.statusCode).toBe(200);
    const importedNodeIds = vi
      .mocked(draftStore.save)
      .mock.calls[0]![0].draft.nodes.map((node: WorkspaceGraphAuthoringNode) => node.id);
    expect(importedNodeIds).toHaveLength(1);
    expect(new Set(importedNodeIds).size).toBe(1);
    for (const nodeId of importedNodeIds) expect(nodeId).toMatch(DVT_SOURCE_NODE_ID_PATTERN);
    expect(response.json()).toMatchObject({
      sourcesCreated: 1,
      outcome: {
        kind: 'graph-draft',
        importedNodeIds,
      },
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
              id: importedNodeIds[0],
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
    const { app, draftStore } = buildApp({
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
        ...SOURCE_IMPORT_REQUEST_BASE,
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
    const importedNodeIds = vi
      .mocked(draftStore.save)
      .mock.calls[0]![0].draft.nodes.map((node: WorkspaceGraphAuthoringNode) => node.id);
    expect(importedNodeIds).toHaveLength(2);
    expect(new Set(importedNodeIds).size).toBe(2);
    for (const nodeId of importedNodeIds) expect(nodeId).toMatch(DVT_SOURCE_NODE_ID_PATTERN);
    expect(response.json()).toMatchObject({
      success: true,
      sourcesCreated: 2,
      objectsImported: 2,
      yamlFiles: ['models/sources/src_analytics.yml', 'models/sources/src_finance.yml'],
      outcome: {
        kind: 'graph-draft',
        importedNodeIds,
      },
      grouping: 'database',
    });
  });

  it('rejects unsupported custom grouping instead of importing with schema semantics', async () => {
    const { app, draftStore, workspaceFiles } = buildApp();

    const response = await app.inject({
      method: 'POST',
      url: `/workspace/sources/import?${SCOPE_QUERY}`,
      payload: {
        ...SOURCE_IMPORT_REQUEST_BASE,
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
        ...SOURCE_IMPORT_REQUEST_BASE,
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
    const importedNodeIds = vi
      .mocked(draftStore.save)
      .mock.calls[0]![0].draft.nodes.map((node: WorkspaceGraphAuthoringNode) => node.id);
    expect(importedNodeIds).toHaveLength(2);
    expect(new Set(importedNodeIds).size).toBe(2);
    for (const nodeId of importedNodeIds) expect(nodeId).toMatch(DVT_SOURCE_NODE_ID_PATTERN);
    expect(response.json()).toMatchObject({
      success: true,
      sourcesCreated: 1,
      objectsImported: 2,
      yamlFiles: ['models/sources/src_erp.yml'],
      outcome: {
        kind: 'graph-draft',
        importedNodeIds,
      },
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
              id: importedNodeIds[0],
              metadata: expect.objectContaining({
                sourceName: 'warehouse_prod_analytics_erp',
                tableName: 'orders',
              }),
            }),
            expect.objectContaining({
              id: importedNodeIds[1],
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
        ...SOURCE_IMPORT_REQUEST_BASE,
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
        ...SOURCE_IMPORT_REQUEST_BASE,
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

  it('returns a stable conflict when an idempotency key is reused', async () => {
    const { app } = buildApp({ saveResult: { kind: 'idempotency_mismatch' } });

    const response = await app.inject({
      method: 'POST',
      url: `/workspace/sources/import?${SCOPE_QUERY}`,
      payload: {
        ...SOURCE_IMPORT_REQUEST_BASE,
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
      error: {
        type: 'conflict',
        reason: 'workspace_source_import_idempotency_mismatch',
      },
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
        ...SOURCE_IMPORT_REQUEST_BASE,
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
