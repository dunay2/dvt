import { describe, expect, it, vi } from 'vitest';

import type {
  IWarehouseConnectionCatalog,
  WarehouseConnection,
  WarehouseConnectionCatalogEntry,
} from '../../../src/application/ports/warehouseSourceImport.js';
import { WarehouseSourceImportDraftConflictError } from '../../../src/application/ports/warehouseSourceImport.js';
import type { IWorkspaceFileRepository } from '../../../src/application/ports/workspaceFiles.js';
import { WorkspaceFileNotFoundError } from '../../../src/application/ports/workspaceFiles.js';
import type {
  IWorkspaceGraphDraftStore,
  WorkspaceGraphDraftSaveStoreResult,
} from '../../../src/application/ports/workspaceGraphDraft.js';
import { ImportWarehouseSourcesUseCase } from '../../../src/application/services/importWarehouseSourcesUseCase.js';

const scope = {
  tenantId: 'tenant-api-it',
  projectId: 'project-api-it',
  environmentId: 'env-api-it',
};

const catalogEntry: WarehouseConnectionCatalogEntry = {
  id: 'warehouse-prod',
  name: 'Production warehouse',
  type: 'postgres',
  database: 'analytics',
  tables: [
    {
      database: 'analytics',
      schema: 'erp',
      table: 'orders',
      rowCount: 42000,
      byteSize: 18432000,
      columns: [
        { name: 'order_id', type: 'integer', nullable: false },
        { name: 'customer_id', type: 'integer', nullable: false },
      ],
    },
  ],
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
    listTables: vi.fn(async () => catalogEntry.tables),
    getConnection: vi.fn(async () => catalogEntry),
    createConnection: vi.fn(async () => ({
      id: catalogEntry.id,
      name: catalogEntry.name,
      type: catalogEntry.type,
      database: catalogEntry.database,
    })),
  };
}

function createDraftStore(
  storedDraft?: unknown,
  saveResult?: WorkspaceGraphDraftSaveStoreResult
): IWorkspaceGraphDraftStore {
  const save = vi.fn(
    async (): Promise<WorkspaceGraphDraftSaveStoreResult> =>
      saveResult ?? {
        kind: 'saved',
        schemaVersion: 'workspace-graph-draft.v1',
        revision: 'rev-2',
        updatedAt: '2026-06-26T00:00:00.000Z',
        deduplicated: false,
      }
  );

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

function createWorkspaceFiles(): IWorkspaceFileRepository {
  return {
    listFiles: vi.fn(async () => []),
    getFileContent: vi.fn(async (path: string) => {
      throw new WorkspaceFileNotFoundError(path);
    }),
    saveFileContent: vi.fn(async (path: string, content: string) => ({
      path,
      name: path.split('/').at(-1) ?? path,
      language: 'yaml',
      content,
      lastModified: '2026-06-26T00:00:00.000Z',
    })),
    deleteFileContent: vi.fn(async () => undefined),
  };
}

describe('ImportWarehouseSourcesUseCase', () => {
  it('persists catalog-owned source statistics and columns into imported graph nodes', async () => {
    const draftStore = createDraftStore();
    const useCase = new ImportWarehouseSourcesUseCase(
      createCatalog(),
      draftStore,
      createWorkspaceFiles(),
      () => new Date('2026-06-26T00:00:00.000Z')
    );

    await useCase.execute({
      scope,
      connectionId: catalogEntry.id,
      tables: [{ database: 'analytics', schema: 'erp', table: 'orders' }],
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
                rowCount: 42000,
                byteSize: 18432000,
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
      createCatalog(),
      draftStore,
      workspaceFiles,
      () => new Date('2026-06-26T00:00:00.000Z')
    );

    await expect(
      useCase.execute({
        scope,
        connectionId: catalogEntry.id,
        tables: [{ database: 'analytics', schema: 'erp', table: 'orders' }],
        groupingStrategy: 'schema',
        includeColumns: true,
        addTests: false,
        addFreshness: false,
      })
    ).rejects.toThrow('workspace file write failed');

    expect(workspaceFiles.saveFileContent).toHaveBeenCalledWith(
      'models/sources/src_erp.yml',
      expect.stringContaining('name: orders')
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
      createCatalog(),
      draftStore,
      workspaceFiles,
      () => new Date('2026-06-26T00:00:00.000Z')
    );

    await expect(
      useCase.execute({
        scope,
        connectionId: catalogEntry.id,
        tables: [{ database: 'analytics', schema: 'erp', table: 'orders' }],
        groupingStrategy: 'schema',
        includeColumns: true,
        addTests: false,
        addFreshness: false,
      })
    ).rejects.toBeInstanceOf(WarehouseSourceImportDraftConflictError);

    expect(draftStore.save).toHaveBeenCalled();
    expect(workspaceFiles.saveFileContent).toHaveBeenCalledWith(
      'models/sources/src_erp.yml',
      expect.stringContaining('name: orders')
    );
    expect(workspaceFiles.deleteFileContent).toHaveBeenCalledWith('models/sources/src_erp.yml');
  });

  it('persists normalized source node ids and yaml paths for non-slug warehouse names', async () => {
    const draftStore = createDraftStore();
    const catalog: IWarehouseConnectionCatalog = {
      ...createCatalog(),
      listTables: vi.fn(async () => [
        {
          database: 'Raw Lake',
          schema: 'Sales/ERP Ops',
          table: 'Open Orders',
          rowCount: 1200,
        },
      ]),
      getConnection: vi.fn(async () => ({
        ...catalogEntry,
        tables: [
          {
            database: 'Raw Lake',
            schema: 'Sales/ERP Ops',
            table: 'Open Orders',
            rowCount: 1200,
          },
        ],
      })),
    };
    const useCase = new ImportWarehouseSourcesUseCase(
      catalog,
      draftStore,
      createWorkspaceFiles(),
      () => new Date('2026-06-26T00:00:00.000Z')
    );

    const result = await useCase.execute({
      scope,
      connectionId: catalogEntry.id,
      tables: [{ database: 'Raw Lake', schema: 'Sales/ERP Ops', table: 'Open Orders' }],
      groupingStrategy: 'schema',
      includeColumns: true,
      addTests: false,
      addFreshness: false,
    });

    expect(result.yamlFiles).toEqual(['models/sources/src_sales_erp_ops.yml']);
    expect(result.importedNodeIds[0]).toMatch(
      /^src_warehouse_prod_raw_lake_[a-f0-9]{8}_sales_erp_ops_[a-f0-9]{8}_open_orders_[a-f0-9]{8}$/
    );
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

  it('keeps source imports idempotent when the draft still contains a retired raw-lower source id', async () => {
    const retiredNodeId = 'src_warehouse_prod_raw lake_sales/erp ops_open orders';
    const draftStore = createDraftStore({
      canvas: {
        id: 'default',
        kind: 'canvas',
        title: 'Canvas',
        environmentId: scope.environmentId,
      },
      activeCanvasId: 'default',
      nodeIds: [retiredNodeId],
      nodePositions: { [retiredNodeId]: { x: 80, y: 120 } },
      nodes: [
        {
          id: retiredNodeId,
          name: retiredNodeId,
          pluginId: 'dvt.warehouse-source',
          kind: 'dvt:source',
          role: 'input',
          status: 'idle',
          tags: ['source', 'sales/erp ops'],
          path: 'models/sources/src_sales_erp_ops.yml',
          description: 'Imported source for Raw Lake.Sales/ERP Ops.Open Orders',
          metadata: {
            sourceName: 'sales_erp_ops',
            tableName: 'open orders',
            connectionName: 'Production warehouse',
            connectionType: 'postgres',
            database: 'Raw Lake',
            schema: 'Sales/ERP Ops',
          },
        },
      ],
      edges: [],
      canvases: [
        {
          canvas: {
            id: 'default',
            kind: 'canvas',
            title: 'Canvas',
            environmentId: scope.environmentId,
          },
          nodeIds: [retiredNodeId],
          nodePositions: { [retiredNodeId]: { x: 80, y: 120 } },
          nodes: [
            {
              id: retiredNodeId,
              name: retiredNodeId,
              pluginId: 'dvt.warehouse-source',
              kind: 'dvt:source',
              role: 'input',
              status: 'idle',
              tags: ['source', 'sales/erp ops'],
              path: 'models/sources/src_sales_erp_ops.yml',
              description: 'Imported source for Raw Lake.Sales/ERP Ops.Open Orders',
              metadata: {
                sourceName: 'sales_erp_ops',
                tableName: 'open orders',
                connectionName: 'Production warehouse',
                connectionType: 'postgres',
                database: 'Raw Lake',
                schema: 'Sales/ERP Ops',
              },
            },
          ],
          edges: [],
        },
      ],
    });
    const catalog: IWarehouseConnectionCatalog = {
      ...createCatalog(),
      listTables: vi.fn(async () => [
        {
          database: 'Raw Lake',
          schema: 'Sales/ERP Ops',
          table: 'Open Orders',
        },
      ]),
      getConnection: vi.fn(async () => ({
        ...catalogEntry,
        tables: [
          {
            database: 'Raw Lake',
            schema: 'Sales/ERP Ops',
            table: 'Open Orders',
          },
        ],
      })),
    };
    const useCase = new ImportWarehouseSourcesUseCase(
      catalog,
      draftStore,
      createWorkspaceFiles(),
      () => new Date('2026-06-26T00:00:00.000Z')
    );

    const result = await useCase.execute({
      scope,
      connectionId: catalogEntry.id,
      tables: [{ database: 'Raw Lake', schema: 'Sales/ERP Ops', table: 'Open Orders' }],
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
          nodeIds: [retiredNodeId],
          nodes: [expect.objectContaining({ id: retiredNodeId })],
        }),
      })
    );
  });
});
