import { describe, expect, it, vi } from 'vitest';

import type {
  IWarehouseConnectionCatalog,
  WarehouseConnection,
  WarehouseConnectionCatalogEntry,
} from '../../../src/application/ports/warehouseSourceImport.js';
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

function createDraftStore(): IWorkspaceGraphDraftStore {
  const save = vi.fn(
    async (): Promise<WorkspaceGraphDraftSaveStoreResult> => ({
      kind: 'saved',
      schemaVersion: 'workspace-graph-draft.v1',
      revision: 'rev-2',
      updatedAt: '2026-06-26T00:00:00.000Z',
      deduplicated: false,
    })
  );

  return {
    migrate: vi.fn(async () => undefined),
    close: vi.fn(async () => undefined),
    read: vi.fn(async () => null),
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
});
