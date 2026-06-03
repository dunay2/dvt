import { describe, expect, it } from 'vitest';

import { WarehouseConnectionNotFoundError } from '../../../src/application/ports/warehouseSourceImport.js';
import { WorkspaceFileNotFoundError } from '../../../src/application/ports/workspaceFiles.js';
import type {
  IWorkspaceFileRepository,
  WorkspaceFileContent,
  WorkspaceFileEntry,
} from '../../../src/application/ports/workspaceFiles.js';
import {
  WORKSPACE_WAREHOUSE_CONNECTION_CATALOG_PATH,
  WorkspaceWarehouseConnectionCatalog,
} from '../../../src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.js';

class MemoryWorkspaceFileRepository implements IWorkspaceFileRepository {
  public constructor(private readonly files: Readonly<Record<string, string>>) {}

  public async listFiles(): Promise<readonly WorkspaceFileEntry[]> {
    return [];
  }

  public async getFileContent(path: string): Promise<WorkspaceFileContent> {
    const content = this.files[path];
    if (content === undefined) {
      throw new WorkspaceFileNotFoundError(path);
    }

    return {
      path,
      name: path.split('/').at(-1) ?? path,
      language: 'json',
      content,
      lastModified: '2026-05-31T00:00:00.000Z',
    };
  }

  public async saveFileContent(): Promise<WorkspaceFileContent> {
    throw new Error('NOT_USED');
  }
}

function repositoryWithCatalog(catalog: unknown): IWorkspaceFileRepository {
  return new MemoryWorkspaceFileRepository({
    [WORKSPACE_WAREHOUSE_CONNECTION_CATALOG_PATH]: JSON.stringify(catalog),
  });
}

describe('WorkspaceWarehouseConnectionCatalog', () => {
  it('reads connection and table metadata from the workspace governed catalog file', async () => {
    const catalog = new WorkspaceWarehouseConnectionCatalog({
      repository: repositoryWithCatalog({
        connections: [
          {
            id: 'finance-prod',
            name: 'Finance production',
            type: 'postgres',
            database: 'analytics',
            tables: [
              {
                database: 'analytics',
                schema: 'erp',
                table: 'orders',
                rowCount: 128,
                columns: [{ name: 'id', type: 'integer', nullable: false }],
              },
            ],
          },
        ],
      }),
    });

    await expect(catalog.listConnections()).resolves.toEqual([
      {
        id: 'finance-prod',
        name: 'Finance production',
        type: 'postgres',
        database: 'analytics',
      },
    ]);
    await expect(catalog.listTables('finance-prod')).resolves.toEqual([
      {
        database: 'analytics',
        schema: 'erp',
        table: 'orders',
        rowCount: 128,
        columns: [{ name: 'id', type: 'integer', nullable: false }],
      },
    ]);
  });

  it('returns an empty catalog when the workspace has no governed catalog file', async () => {
    const catalog = new WorkspaceWarehouseConnectionCatalog({
      repository: new MemoryWorkspaceFileRepository({}),
    });

    await expect(catalog.listConnections()).resolves.toEqual([]);
    await expect(catalog.listTables('missing')).rejects.toBeInstanceOf(
      WarehouseConnectionNotFoundError
    );
  });

  it('fails closed when duplicate table identities appear in the governed catalog', async () => {
    const catalog = new WorkspaceWarehouseConnectionCatalog({
      repository: repositoryWithCatalog({
        connections: [
          {
            id: 'finance-prod',
            name: 'Finance production',
            type: 'postgres',
            database: 'analytics',
            tables: [
              { database: 'analytics', schema: 'erp', table: 'orders' },
              { database: 'analytics', schema: 'erp', table: 'orders' },
            ],
          },
        ],
      }),
    });

    await expect(catalog.listConnections()).rejects.toThrow(/Duplicate warehouse table/);
  });
});
