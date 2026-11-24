import { createHash } from 'node:crypto';

import {
  type WorkspaceGraphAuthoringNode,
  type WorkspaceGraphAuthoringDraft,
  buildRelationalSourceObjectId,
  type CanvasAuthoringAuthorityBinding,
  type SourceObject,
  type SourceObjectColumn,
  type SourceObjectConstraint,
  type SourceObjectCatalogRequest,
  type SourceObjectCatalogResponse,
  type SourceObjectMetricEvidence,
  type WorkspaceGraphDraftScope,
} from '@dvt/contracts';
import Fastify, { type LightMyRequestResponse, type FastifyInstance } from 'fastify';
import { expect, vi, type Mock } from 'vitest';

/** Owned concern: compose real protected warehouse HTTP routes around isolated fixture stores. */

import type { CanvasAuthoringAuthorityKey } from '../../../src/application/ports/canvasAuthoringAuthority.js';
import {
  DuplicateWarehouseConnectionError,
  WarehouseConnectionNotFoundError,
  type CreateWarehouseConnectionCatalogInput,
  type IWarehouseConnectionCatalog,
  type IWarehouseConnectionProbe,
  type IWarehouseSourceDataSampleProbe,
  type InspectWarehouseConnectionResult,
  type TestWarehouseConnectionResult,
  type WarehouseConnection,
  type WarehouseConnectionCatalogEntry,
} from '../../../src/application/ports/warehouseSourceImport.js';
import {
  WorkspaceFileNotFoundError,
  type DeleteWorkspaceFileContentInput,
  type IWorkspaceFileBatchMutationPort,
  type SaveWorkspaceFileContentInput,
  type WorkspaceFileBatchMutation,
  type WorkspaceFileBatchMutationResult,
  type WorkspaceFileContent,
  type WorkspaceFileDeleteResult,
  type WorkspaceFileEntry,
  type WorkspaceFileSaveResult,
  type WorkspaceStorageScope,
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

export const SCOPE_QUERY = 'tenantId=tenant-a&projectId=project-a&environmentId=env-a';

export const DVT_SOURCE_NODE_ID_PATTERN =
  /^dvt_src_[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;

export const ROUTE_SCOPE = {
  tenantId: 'tenant-a',
  projectId: 'project-a',
  environmentId: 'env-a',
} as const satisfies WorkspaceGraphDraftScope;

export const SOURCE_IMPORT_REQUEST_BASE = {
  schemaVersion: 'source-import-request.v2',
  canvasId: 'canvas-a',
  idempotencyKey: 'source-import-route-test',
} as const;

export function measuredMetrics(rowCount: number, byteSize: number): SourceObjectMetricEvidence {
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

export function relationSourceObject(
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

export const defaultOrdersSourceObject = relationSourceObject({
  columns: [{ name: 'id', type: 'number', nullable: false }],
  constraints: [{ name: 'orders_pkey', kind: 'primary-key', columns: ['id'] }],
});

export class TestWarehouseConnectionCatalog implements IWarehouseConnectionCatalog {
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

export function scopeKey(scope: WorkspaceGraphDraftScope): string {
  return `${scope.tenantId}\u0000${scope.projectId}\u0000${scope.environmentId}`;
}

export type TestWarehouseConnectionProbeFailure = Omit<
  Extract<InspectWarehouseConnectionResult, { readonly status: 'failed' }>,
  'checkedAt'
> & {
  readonly checkedAt?: string;
};

export class TestWarehouseConnectionProbe
  implements IWarehouseConnectionProbe, IWarehouseSourceDataSampleProbe
{
  public constructor(
    private readonly result: TestWarehouseConnectionProbeFailure | null,
    private readonly resolveSourceObjects: (
      input: Parameters<IWarehouseConnectionProbe['inspectConnection']>[0]
    ) => readonly SourceObject[]
  ) {}

  public readonly catalogRequests: SourceObjectCatalogRequest[] = [];

  public async listSourceObjectCatalog(
    input: Parameters<IWarehouseConnectionProbe['listSourceObjectCatalog']>[0],
    request: SourceObjectCatalogRequest
  ): Promise<SourceObjectCatalogResponse> {
    this.catalogRequests.push(request);
    const objects = this.resolveSourceObjects(input);
    if (request.kind === 'schema-list') {
      const counts = new Map<string, { catalog: string; schema: string; objectCount: number }>();
      for (const sourceObject of objects) {
        if (sourceObject.locator.kind !== 'relation') continue;
        const key = JSON.stringify([sourceObject.locator.catalog, sourceObject.locator.schema]);
        const current = counts.get(key);
        counts.set(key, {
          catalog: sourceObject.locator.catalog,
          schema: sourceObject.locator.schema,
          objectCount: (current?.objectCount ?? 0) + 1,
        });
      }
      return { kind: 'schema-list', schemas: [...counts.values()], truncated: false };
    }

    const matches = objects.filter((sourceObject) => {
      if (sourceObject.locator.kind !== 'relation') return false;
      return request.kind === 'schema-page'
        ? sourceObject.locator.catalog === request.catalog &&
            sourceObject.locator.schema === request.schema
        : sourceObject.locator.name.toLocaleLowerCase().includes(request.name.toLocaleLowerCase());
    });
    return { kind: 'object-page', objects: matches.slice(0, request.limit), truncated: false };
  }

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
      queriedAt: '2026-08-17T10:00:00.000Z',
      navigation: 'bounded-first-page',
    };
  }
}

export function principal(): Record<string, unknown> {
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

export function buildApp(
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
  readonly authorize: Mock;
  readonly draftStore: {
    readonly read: Mock;
    readonly save: Mock;
  };
  readonly workspaceFiles: {
    readonly getFileContent: Mock;
    readonly saveFileContent: Mock;
    readonly deleteFileContent: Mock;
  };
  readonly validateSql: Mock;
  readonly probe: TestWarehouseConnectionProbe;
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

  return { app, authorize, draftStore, workspaceFiles, validateSql, probe };
}

export function sha256(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

export async function placeImportedSourceInstance({
  draftStore,
  workspaceFiles,
  invalidReference,
}: Pick<ReturnType<typeof buildApp>, 'draftStore' | 'workspaceFiles'> & {
  invalidReference: boolean;
}): Promise<
  Pick<WorkspaceGraphAuthoringDraft, 'nodeIds' | 'nodePositions'> & {
    instance: WorkspaceGraphAuthoringNode;
  }
> {
  const draft: WorkspaceGraphAuthoringDraft = vi.mocked(draftStore.save).mock.calls[0]![0].draft;
  const definition = draft.nodes[0]!;
  const instance = {
    id: 'placed-orders',
    sourceDefinitionId: invalidReference ? 'missing-definition' : definition.id,
    name: definition.name,
    pluginId: definition.pluginId,
    kind: definition.kind,
    role: definition.role,
    status: definition.status,
    tags: [],
  };
  const nodes = [...draft.nodes, instance];
  const nodeIds = [instance.id];
  const nodePositions = { [instance.id]: { x: 420, y: 240 } };
  const record = await draftStore.read();
  vi.mocked(draftStore.read).mockResolvedValue({
    ...record,
    revision: 'placed-revision',
    draftPayload: {
      ...draft,
      nodes,
      nodeIds,
      nodePositions,
      canvases: draft.canvases?.map((canvas) => ({ ...canvas, nodes, nodeIds, nodePositions })),
    },
  });
  const sourceFile = vi.mocked(workspaceFiles.saveFileContent).mock.calls[0]![1];
  vi.mocked(workspaceFiles.getFileContent).mockResolvedValue({
    path: sourceFile.path,
    name: 'src_erp.yml',
    language: 'yaml',
    content: sourceFile.content,
    contentSha256: sha256(sourceFile.content),
    lastModified: '2026-10-23T00:00:00.000Z',
  });
  return { instance, nodeIds, nodePositions };
}

export function buildDisambiguatedCatalogEntries(): WarehouseConnectionCatalogEntry[] {
  return [
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
  ];
}

export function expectSchemaGroupedYamlContent(
  workspaceFiles: ReturnType<typeof buildApp>['workspaceFiles']
): void {
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
}

export function injectWarehouseRequest(
  app: FastifyInstance,
  {
    path,
    ...options
  }: {
    method: 'GET' | 'POST' | 'PATCH';
    path: string;
    payload?: Record<string, unknown>;
    headers?: Record<string, string>;
  }
): Promise<LightMyRequestResponse> {
  return app.inject({ ...options, url: path + '?' + SCOPE_QUERY });
}

export function buildSourceImportPayload(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    ...SOURCE_IMPORT_REQUEST_BASE,
    connectionId: 'warehouse-prod',
    objects: [{ objectId: defaultOrdersSourceObject.objectId }],
    groupingStrategy: 'schema',
    includeColumns: true,
    addTests: false,
    addFreshness: false,
    ...overrides,
  };
}

export function expectWarehouseAuthorization(
  authorize: ReturnType<typeof buildApp>['authorize'],
  action: { kind: 'command' | 'query'; name: string }
): void {
  expect(authorize).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({ action }),
    expect.any(String)
  );
}

export async function expectSourceImportRejection(input: {
  app: FastifyInstance;
  payload: Record<string, unknown>;
  expectedStatus: number;
  responseBody: unknown;
}): Promise<void> {
  const response = await injectWarehouseRequest(input.app, {
    method: 'POST',
    path: '/workspace/sources/import',
    payload: input.payload,
  });
  expect(response.statusCode).toBe(input.expectedStatus);
  expect(response.json()).toEqual(input.responseBody);
}

export function expectedWarehouseConnection(name: string): WarehouseConnection {
  return { id: 'warehouse-prod', name, type: 'postgres', database: 'analytics' };
}

export async function expectProtectedWarehouseConnectionRequest(input: {
  request: Parameters<typeof injectWarehouseRequest>[1];
  responseBody: WarehouseConnection | readonly WarehouseConnection[];
  operation: Parameters<typeof expectWarehouseAuthorization>[1];
}): Promise<void> {
  const { app, authorize } = buildApp();
  const response = await injectWarehouseRequest(app, input.request);
  expect(response.statusCode).toBe(200);
  expect(response.json()).toEqual(input.responseBody);
  expectWarehouseAuthorization(authorize, input.operation);
}

export async function expectProtectedWarehouseConnectionRename(name: string): Promise<void> {
  await expectProtectedWarehouseConnectionRequest({
    request: {
      method: 'PATCH',
      path: '/workspace/warehouse/connections/warehouse-prod',
      payload: { name },
    },
    responseBody: expectedWarehouseConnection(name),
    operation: { kind: 'command', name: 'workspace:source-connection:rename' },
  });
}

export async function expectProtectedWarehouseConnectionList(
  expectedConnections: readonly WarehouseConnection[]
): Promise<void> {
  await expectProtectedWarehouseConnectionRequest({
    request: { method: 'GET', path: '/workspace/warehouse/connections' },
    responseBody: expectedConnections,
    operation: { kind: 'query', name: 'workspace:source-import:view' },
  });
}

export async function expectSourceImportRejectedWithoutMutation(input: {
  fixtureOptions?: Parameters<typeof buildApp>[0];
  payload: Record<string, unknown>;
  responseBody: unknown;
}): Promise<void> {
  const { app, draftStore, workspaceFiles } = buildApp(input.fixtureOptions);
  await expectSourceImportRejection({
    app,
    payload: input.payload,
    expectedStatus: 400,
    responseBody: input.responseBody,
  });
  expect(workspaceFiles.saveFileContent).not.toHaveBeenCalled();
  expect(draftStore.save).not.toHaveBeenCalled();
}
