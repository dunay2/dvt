import { createHash } from 'node:crypto';

import {
  buildRelationalSourceObjectId,
  type SourceObject,
  type SourceObjectColumn,
  type SourceObjectMetricEvidence,
} from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import type {
  IWarehouseConnectionCatalog,
  IWarehouseConnectionProbe,
  WarehouseConnection,
  WarehouseConnectionCatalogEntry,
} from '../../../src/application/ports/warehouseSourceImport.js';
import {
  InvalidWarehouseSourceImportRequestError,
  SourceObjectNotFoundError,
  UnsupportedSourceObjectImportError,
  WarehouseSourceImportDraftConflictError,
} from '../../../src/application/ports/warehouseSourceImport.js';
import type { IWorkspaceFileRepository } from '../../../src/application/ports/workspaceFiles.js';
import { WorkspaceFileNotFoundError } from '../../../src/application/ports/workspaceFiles.js';
import type {
  IWorkspaceGraphDraftStore,
  WorkspaceGraphDraftSaveStoreResult,
} from '../../../src/application/ports/workspaceGraphDraft.js';
import { ImportWarehouseSourcesUseCase } from '../../../src/application/services/importWarehouseSourcesUseCase.js';
import { WarehouseConnectionSourceObjectReader } from '../../../src/application/services/WarehouseConnectionSourceObjectReader.js';

const scope = {
  tenantId: 'tenant-api-it',
  projectId: 'project-api-it',
  environmentId: 'env-api-it',
};

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

function estimatedMetrics(rowCount: number, byteSize: number): SourceObjectMetricEvidence {
  return {
    observedAt: '2026-07-10T21:00:00.000Z',
    observationScope: { kind: 'snapshot' },
    rowCount: {
      value: rowCount,
      provenance: 'estimated',
      method: 'query-plan',
      confidence: 'low',
    },
    byteSize: {
      value: byteSize,
      provenance: 'estimated',
      method: 'schema-width',
      confidence: 'low',
      basis: 'logical-payload',
    },
  };
}

function relationalSourceObject(
  input: Readonly<{
    catalog?: string;
    schema?: string;
    name?: string;
    metricEvidence?: SourceObjectMetricEvidence;
    columns?: readonly SourceObjectColumn[];
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
    metricEvidence: input.metricEvidence ?? measuredMetrics(42000, 18432000),
    ...(input.columns ? { columns: [...input.columns] } : {}),
  };
}

const ordersSourceObject = relationalSourceObject({
  columns: [
    { name: 'order_id', type: 'integer', nullable: false },
    { name: 'customer_id', type: 'integer', nullable: false },
  ],
});

const catalogEntry: WarehouseConnectionCatalogEntry = {
  id: 'warehouse-prod',
  name: 'Production warehouse',
  type: 'postgres',
  database: 'analytics',
  credentialRef: 'env:DVT_WAREHOUSE_URL',
  sourceObjects: [ordersSourceObject],
};

function createCatalog(): IWarehouseConnectionCatalog {
  return {
    listConnections: vi.fn(
      async (): Promise<readonly WarehouseConnection[]> => [
        {
          id: catalogEntry.id,
          name: catalogEntry.name,
          type: catalogEntry.type,
          database: catalogEntry.database,
        },
      ]
    ),
    listSourceObjects: vi.fn(async () => catalogEntry.sourceObjects),
    getConnection: vi.fn(async () => catalogEntry),
    createConnection: vi.fn(async () => ({
      id: catalogEntry.id,
      name: catalogEntry.name,
      type: catalogEntry.type,
      database: catalogEntry.database,
    })),
  };
}

function createSourceObjectReader(
  catalog: IWarehouseConnectionCatalog = createCatalog()
): WarehouseConnectionSourceObjectReader {
  const probe: IWarehouseConnectionProbe = {
    inspectConnection: vi.fn(
      async (): Promise<Awaited<ReturnType<IWarehouseConnectionProbe['inspectConnection']>>> => ({
        status: 'passed',
        checkedAt: '2026-07-10T21:00:00.000Z',
        sourceObjects: await catalog.listSourceObjects(scope, catalogEntry.id),
      })
    ),
    testConnection: vi.fn(),
  };
  return new WarehouseConnectionSourceObjectReader(catalog, probe);
}

function createDraftStore(
  storedDraft?: unknown,
  saveResult?: WorkspaceGraphDraftSaveStoreResult,
  onSave?: () => void | Promise<void>
): IWorkspaceGraphDraftStore {
  const save = vi.fn(async (): Promise<WorkspaceGraphDraftSaveStoreResult> => {
    await onSave?.();
    return (
      saveResult ?? {
        kind: 'saved',
        schemaVersion: 'workspace-graph-draft.v1',
        revision: 'rev-2',
        updatedAt: '2026-06-26T00:00:00.000Z',
        deduplicated: false,
      }
    );
  });

  return {
    migrate: vi.fn(async () => undefined),
    close: vi.fn(async () => undefined),
    read: vi.fn(async () =>
      storedDraft === undefined
        ? null
        : {
            scope,
            schemaVersion: 'workspace-graph-draft.v1',
            revision: 'rev-1',
            draftPayload: storedDraft,
            updatedAt: '2026-06-26T00:00:00.000Z',
          }
    ),
    save,
  };
}

type WorkspaceFileTestDouble = IWorkspaceFileRepository & {
  readonly readSavedFile: (path: string) => string | undefined;
  readonly writeSavedFile: (path: string, content: string) => void;
};

function createWorkspaceFiles(initialFiles: Record<string, string> = {}): WorkspaceFileTestDouble {
  const files = new Map(Object.entries(initialFiles));
  return {
    listFiles: vi.fn(async () => []),
    getFileContent: vi.fn(async (_scope, path: string) => {
      const content = files.get(path);
      if (content !== undefined) {
        return {
          path,
          name: path.split('/').at(-1) ?? path,
          language: 'yaml',
          content,
          contentSha256: sha256(content),
          lastModified: '2026-06-26T00:00:00.000Z',
        };
      }
      throw new WorkspaceFileNotFoundError(path);
    }),
    saveFileContent: vi.fn(async (_scope, input) => {
      const currentContent = files.get(input.path);
      const currentContentSha256 = currentContent === undefined ? null : sha256(currentContent);
      const requestedContentSha256 = sha256(input.content);
      if (currentContentSha256 === requestedContentSha256) {
        return {
          kind: 'unchanged' as const,
          disposition: null,
          path: input.path,
          contentSha256: requestedContentSha256,
          lastModified: '2026-06-26T00:00:00.000Z',
        };
      }
      const matchesExpectedRevision =
        input.expectedRevision.kind === 'absent'
          ? currentContentSha256 === null
          : input.expectedRevision.value === currentContentSha256;
      if (!matchesExpectedRevision) {
        return { kind: 'conflict' as const, currentContentSha256 };
      }
      const disposition: 'created' | 'updated' = files.has(input.path) ? 'updated' : 'created';
      files.set(input.path, input.content);
      return {
        kind: 'saved' as const,
        disposition,
        path: input.path,
        contentSha256: sha256(input.content),
        lastModified: '2026-06-26T00:00:00.000Z',
      };
    }),
    deleteFileContent: vi.fn(async (_scope, input) => {
      const currentContent = files.get(input.path);
      if (currentContent === undefined) {
        return { kind: 'unchanged' as const };
      }
      const currentContentSha256 = sha256(currentContent);
      if (currentContentSha256 !== input.expectedRevision.value) {
        return { kind: 'conflict' as const, currentContentSha256 };
      }
      files.delete(input.path);
      return { kind: 'deleted' as const };
    }),
    readSavedFile: (path: string) => files.get(path),
    writeSavedFile: (path: string, content: string) => {
      files.set(path, content);
    },
  };
}

function sha256(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

describe('ImportWarehouseSourcesUseCase', () => {
  it('persists catalog-owned source statistics and columns into imported graph nodes', async () => {
    const draftStore = createDraftStore();
    const useCase = new ImportWarehouseSourcesUseCase(
      createSourceObjectReader(),
      draftStore,
      createWorkspaceFiles(),
      () => new Date('2026-06-26T00:00:00.000Z')
    );

    await useCase.execute({
      scope,
      connectionId: catalogEntry.id,
      objects: [{ objectId: ordersSourceObject.objectId }],
      groupingStrategy: 'schema',
      includeColumns: true,
      addTests: false,
      addFreshness: false,
    });

    expect(draftStore.save).toHaveBeenCalledWith(
      expect.objectContaining({
        draft: expect.objectContaining({
          nodes: [
            expect.objectContaining({
              id: 'src_warehouse_prod_analytics_erp_orders',
              metadata: expect.objectContaining({
                connectionName: 'Production warehouse',
                connectionType: 'postgres',
                database: 'analytics',
                schema: 'erp',
                tableName: 'orders',
                sourceMetricEvidence: measuredMetrics(42000, 18432000),
                columns: [
                  { name: 'order_id', type: 'integer', nullable: false },
                  { name: 'customer_id', type: 'integer', nullable: false },
                ],
              }),
            }),
          ],
        }),
      })
    );
  });

  it('does not accept the draft mutation when source YAML persistence fails', async () => {
    const draftStore = createDraftStore();
    const workspaceFiles: IWorkspaceFileRepository = {
      ...createWorkspaceFiles(),
      saveFileContent: vi.fn(async () => {
        throw new Error('workspace file write failed');
      }),
    };
    const useCase = new ImportWarehouseSourcesUseCase(
      createSourceObjectReader(),
      draftStore,
      workspaceFiles,
      () => new Date('2026-06-26T00:00:00.000Z')
    );

    await expect(
      useCase.execute({
        scope,
        connectionId: catalogEntry.id,
        objects: [{ objectId: ordersSourceObject.objectId }],
        groupingStrategy: 'schema',
        includeColumns: true,
        addTests: false,
        addFreshness: false,
      })
    ).rejects.toThrow('workspace file write failed');

    expect(workspaceFiles.saveFileContent).toHaveBeenCalledWith(
      scope,
      expect.objectContaining({
        path: 'models/sources/src_erp.yml',
        content: expect.stringContaining('name: orders'),
        expectedRevision: { kind: 'absent' },
      })
    );
    expect(draftStore.save).not.toHaveBeenCalled();
  });

  it('does not persist source YAML when the authoritative draft changed before save', async () => {
    const draftStore = createDraftStore(undefined, {
      kind: 'conflict',
      currentRevision: 'rev-3',
      storedSchemaVersion: 'workspace-graph-draft.v1',
      updatedAt: '2026-06-26T00:00:01.000Z',
    });
    const workspaceFiles = createWorkspaceFiles();
    const useCase = new ImportWarehouseSourcesUseCase(
      createSourceObjectReader(),
      draftStore,
      workspaceFiles,
      () => new Date('2026-06-26T00:00:00.000Z')
    );

    await expect(
      useCase.execute({
        scope,
        connectionId: catalogEntry.id,
        objects: [{ objectId: ordersSourceObject.objectId }],
        groupingStrategy: 'schema',
        includeColumns: true,
        addTests: false,
        addFreshness: false,
      })
    ).rejects.toBeInstanceOf(WarehouseSourceImportDraftConflictError);

    expect(draftStore.save).toHaveBeenCalled();
    expect(workspaceFiles.saveFileContent).toHaveBeenCalledWith(
      scope,
      expect.objectContaining({
        path: 'models/sources/src_erp.yml',
        content: expect.stringContaining('name: orders'),
        expectedRevision: { kind: 'absent' },
      })
    );
    expect(workspaceFiles.deleteFileContent).toHaveBeenCalledWith(
      scope,
      expect.objectContaining({
        path: 'models/sources/src_erp.yml',
        expectedRevision: { kind: 'content_sha256', value: expect.any(String) },
      })
    );
  });

  it('does not roll back source YAML replaced by a concurrent winning import', async () => {
    const sourceYamlPath = 'models/sources/src_erp.yml';
    const concurrentWinnerContent = [
      'version: 2',
      'sources:',
      '  - name: src_erp',
      '    tables:',
      '      - name: orders_from_winner',
      '',
    ].join('\n');
    const workspaceFiles = createWorkspaceFiles();
    const draftStore = createDraftStore(
      undefined,
      {
        kind: 'conflict',
        currentRevision: 'rev-3',
        storedSchemaVersion: 'workspace-graph-draft.v1',
        updatedAt: '2026-06-26T00:00:01.000Z',
      },
      () => {
        workspaceFiles.writeSavedFile(sourceYamlPath, concurrentWinnerContent);
      }
    );
    const useCase = new ImportWarehouseSourcesUseCase(
      createSourceObjectReader(),
      draftStore,
      workspaceFiles,
      () => new Date('2026-06-26T00:00:00.000Z')
    );

    await expect(
      useCase.execute({
        scope,
        connectionId: catalogEntry.id,
        objects: [{ objectId: ordersSourceObject.objectId }],
        groupingStrategy: 'schema',
        includeColumns: true,
        addTests: false,
        addFreshness: false,
      })
    ).rejects.toBeInstanceOf(WarehouseSourceImportDraftConflictError);

    expect(workspaceFiles.deleteFileContent).toHaveBeenCalledWith(
      scope,
      expect.objectContaining({
        path: sourceYamlPath,
        expectedRevision: { kind: 'content_sha256', value: expect.any(String) },
      })
    );
    expect(workspaceFiles.readSavedFile(sourceYamlPath)).toBe(concurrentWinnerContent);
  });

  it('persists normalized source node ids and yaml paths for non-slug warehouse names', async () => {
    const draftStore = createDraftStore();
    const rawOrders = relationalSourceObject({
      catalog: 'Raw Lake',
      schema: 'Sales/ERP Ops',
      name: 'Open Orders',
      metricEvidence: measuredMetrics(1200, 409600),
    });
    const catalog: IWarehouseConnectionCatalog = {
      ...createCatalog(),
      listSourceObjects: vi.fn(async () => [rawOrders]),
      getConnection: vi.fn(async () => ({
        ...catalogEntry,
        sourceObjects: [rawOrders],
      })),
    };
    const useCase = new ImportWarehouseSourcesUseCase(
      createSourceObjectReader(catalog),
      draftStore,
      createWorkspaceFiles(),
      () => new Date('2026-06-26T00:00:00.000Z')
    );

    const result = await useCase.execute({
      scope,
      connectionId: catalogEntry.id,
      objects: [{ objectId: rawOrders.objectId }],
      groupingStrategy: 'schema',
      includeColumns: true,
      addTests: false,
      addFreshness: false,
    });

    expect(result.yamlFiles).toEqual(['models/sources/src_sales_erp_ops.yml']);
    expect(result.importedNodeIds).toEqual([
      'src_warehouse_prod_raw_lake_sales_erp_ops_open_orders',
    ]);
    expect(draftStore.save).toHaveBeenCalledWith(
      expect.objectContaining({
        draft: expect.objectContaining({
          nodes: [
            expect.objectContaining({
              id: result.importedNodeIds[0],
              path: 'models/sources/src_sales_erp_ops.yml',
            }),
          ],
        }),
      })
    );
  });

  it('adds a deterministic suffix only when distinct source objects share one stable node id', async () => {
    const draftStore = createDraftStore();
    const spacedOrders = relationalSourceObject({ name: 'Open Orders' });
    const hyphenatedOrders = relationalSourceObject({ name: 'Open-Orders' });
    const catalog: IWarehouseConnectionCatalog = {
      ...createCatalog(),
      listSourceObjects: vi.fn(async () => [spacedOrders, hyphenatedOrders]),
      getConnection: vi.fn(async () => ({
        ...catalogEntry,
        sourceObjects: [spacedOrders, hyphenatedOrders],
      })),
    };
    const useCase = new ImportWarehouseSourcesUseCase(
      createSourceObjectReader(catalog),
      draftStore,
      createWorkspaceFiles(),
      () => new Date('2026-06-26T00:00:00.000Z')
    );

    const result = await useCase.execute({
      scope,
      connectionId: catalogEntry.id,
      objects: [{ objectId: spacedOrders.objectId }, { objectId: hyphenatedOrders.objectId }],
      groupingStrategy: 'schema',
      includeColumns: true,
      addTests: false,
      addFreshness: false,
    });

    expect(new Set(result.importedNodeIds).size).toBe(2);
    expect(result.importedNodeIds).toEqual([
      expect.stringMatching(/^src_warehouse_prod_analytics_erp_open_orders_[a-f0-9]{8}$/),
      expect.stringMatching(/^src_warehouse_prod_analytics_erp_open_orders_[a-f0-9]{8}$/),
    ]);
  });

  it('persists estimated source metric evidence separately from measured evidence', async () => {
    const draftStore = createDraftStore();
    const estimatedOrders = relationalSourceObject({
      metricEvidence: estimatedMetrics(1200, 111600),
      columns: [
        { name: 'order_id', type: 'integer', nullable: false },
        { name: 'customer', type: 'text', nullable: true },
      ],
    });
    const catalog: IWarehouseConnectionCatalog = {
      ...createCatalog(),
      listSourceObjects: vi.fn(async () => [estimatedOrders]),
      getConnection: vi.fn(async () => ({
        ...catalogEntry,
        sourceObjects: [estimatedOrders],
      })),
    };
    const useCase = new ImportWarehouseSourcesUseCase(
      createSourceObjectReader(catalog),
      draftStore,
      createWorkspaceFiles(),
      () => new Date('2026-06-26T00:00:00.000Z')
    );

    await useCase.execute({
      scope,
      connectionId: catalogEntry.id,
      objects: [{ objectId: estimatedOrders.objectId }],
      groupingStrategy: 'schema',
      includeColumns: true,
      addTests: false,
      addFreshness: false,
    });

    expect(draftStore.save).toHaveBeenCalledWith(
      expect.objectContaining({
        draft: expect.objectContaining({
          nodes: [
            expect.objectContaining({
              metadata: expect.objectContaining({
                sourceMetricEvidence: estimatedMetrics(1200, 111600),
              }),
            }),
          ],
        }),
      })
    );
    expect(draftStore.save).toHaveBeenCalledWith(
      expect.objectContaining({
        draft: expect.objectContaining({
          nodes: [
            expect.objectContaining({
              metadata: expect.not.objectContaining({ byteSize: expect.any(Number) }),
            }),
          ],
        }),
      })
    );
  });

  it('keeps source imports idempotent for the canonical source-object node identity', async () => {
    const nodeId = 'src_warehouse_prod_analytics_erp_orders';
    const existingNode = {
      id: nodeId,
      name: ordersSourceObject.displayName,
      pluginId: 'dvt.warehouse-source',
      kind: 'dvt:source',
      role: 'input',
      status: 'idle',
      tags: ['source', 'erp'],
      path: 'models/sources/src_erp.yml',
      description: 'Imported source for analytics.erp.orders',
      metadata: {
        sourceObjectId: ordersSourceObject.objectId,
        sourceName: 'warehouse_prod_analytics_erp',
        tableName: 'orders',
        connectionName: 'Production warehouse',
        connectionType: 'postgres',
        database: 'analytics',
        schema: 'erp',
      },
    };
    const draftStore = createDraftStore({
      canvas: {
        id: 'default',
        kind: 'canvas',
        title: 'Canvas',
        environmentId: scope.environmentId,
      },
      activeCanvasId: 'default',
      nodeIds: [nodeId],
      nodePositions: { [nodeId]: { x: 80, y: 120 } },
      nodes: [existingNode],
      edges: [],
      canvases: [
        {
          canvas: {
            id: 'default',
            kind: 'canvas',
            title: 'Canvas',
            environmentId: scope.environmentId,
          },
          nodeIds: [nodeId],
          nodePositions: { [nodeId]: { x: 80, y: 120 } },
          nodes: [existingNode],
          edges: [],
        },
      ],
    });
    const useCase = new ImportWarehouseSourcesUseCase(
      createSourceObjectReader(),
      draftStore,
      createWorkspaceFiles(),
      () => new Date('2026-06-26T00:00:00.000Z')
    );

    const result = await useCase.execute({
      scope,
      connectionId: catalogEntry.id,
      objects: [{ objectId: ordersSourceObject.objectId }],
      groupingStrategy: 'schema',
      includeColumns: true,
      addTests: false,
      addFreshness: false,
    });

    expect(result.sourcesCreated).toBe(0);
    expect(result.importedNodeIds).toEqual([]);
    expect(draftStore.save).toHaveBeenCalledWith(
      expect.objectContaining({
        draft: expect.objectContaining({
          nodeIds: [nodeId],
          nodes: [expect.objectContaining({ id: nodeId })],
        }),
      })
    );
  });

  it('rejects an object identifier that is absent from the authoritative catalog', async () => {
    const draftStore = createDraftStore();
    const workspaceFiles = createWorkspaceFiles();
    const useCase = new ImportWarehouseSourcesUseCase(
      createSourceObjectReader(),
      draftStore,
      workspaceFiles,
      () => new Date('2026-06-26T00:00:00.000Z')
    );

    await expect(
      useCase.execute({
        scope,
        connectionId: catalogEntry.id,
        objects: [{ objectId: 'relation/analytics/erp/missing' }],
        groupingStrategy: 'schema',
        includeColumns: true,
        addTests: false,
        addFreshness: false,
      })
    ).rejects.toBeInstanceOf(SourceObjectNotFoundError);

    expect(workspaceFiles.saveFileContent).not.toHaveBeenCalled();
    expect(draftStore.save).not.toHaveBeenCalled();
  });

  it('rejects duplicate object selections at the application boundary before side effects', async () => {
    const draftStore = createDraftStore();
    const workspaceFiles = createWorkspaceFiles();
    const useCase = new ImportWarehouseSourcesUseCase(
      createSourceObjectReader(),
      draftStore,
      workspaceFiles,
      () => new Date('2026-06-26T00:00:00.000Z')
    );

    await expect(
      useCase.execute({
        scope,
        connectionId: catalogEntry.id,
        objects: [
          { objectId: ordersSourceObject.objectId },
          { objectId: ordersSourceObject.objectId },
        ],
        groupingStrategy: 'schema',
        includeColumns: true,
        addTests: false,
        addFreshness: false,
      })
    ).rejects.toBeInstanceOf(InvalidWarehouseSourceImportRequestError);

    expect(workspaceFiles.saveFileContent).not.toHaveBeenCalled();
    expect(draftStore.save).not.toHaveBeenCalled();
  });

  it('rejects a non-relational object before mutating YAML or the graph draft', async () => {
    const fileSourceObject: SourceObject = {
      objectId: 'file/s3%3A%2F%2Flanding%2Forders.parquet',
      displayName: 'orders.parquet',
      locator: {
        kind: 'file',
        path: 's3://landing/orders.parquet',
        format: 'parquet',
      },
      metricEvidence: measuredMetrics(42000, 18432000),
    };
    const catalog: IWarehouseConnectionCatalog = {
      ...createCatalog(),
      listSourceObjects: vi.fn(async () => [fileSourceObject]),
      getConnection: vi.fn(async () => ({
        ...catalogEntry,
        sourceObjects: [fileSourceObject],
      })),
    };
    const draftStore = createDraftStore();
    const workspaceFiles = createWorkspaceFiles();
    const useCase = new ImportWarehouseSourcesUseCase(
      createSourceObjectReader(catalog),
      draftStore,
      workspaceFiles,
      () => new Date('2026-06-26T00:00:00.000Z')
    );

    await expect(
      useCase.execute({
        scope,
        connectionId: catalogEntry.id,
        objects: [{ objectId: fileSourceObject.objectId }],
        groupingStrategy: 'schema',
        includeColumns: true,
        addTests: false,
        addFreshness: false,
      })
    ).rejects.toBeInstanceOf(UnsupportedSourceObjectImportError);

    expect(workspaceFiles.saveFileContent).not.toHaveBeenCalled();
    expect(draftStore.save).not.toHaveBeenCalled();
  });
});
