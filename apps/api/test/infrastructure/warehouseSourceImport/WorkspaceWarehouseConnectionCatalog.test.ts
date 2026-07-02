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
  public readonly savedFiles: Record<string, string> = {};

  public constructor(private readonly files: Record<string, string>) {}

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

  public async saveFileContent(path: string, content: string): Promise<WorkspaceFileContent> {
    this.savedFiles[path] = content;
    this.files[path] = content;
    return {
      path,
      name: path.split('/').at(-1) ?? path,
      language: 'json',
      content,
      lastModified: '2026-05-31T00:00:01.000Z',
    };
  }
}

function repositoryWithCatalog(catalog: unknown): IWorkspaceFileRepository {
  return new MemoryWorkspaceFileRepository({
    [WORKSPACE_WAREHOUSE_CONNECTION_CATALOG_PATH]: JSON.stringify(catalog),
  });
}

describe('WorkspaceWarehouseConnectionCatalog', () => {
  it('creates a governed warehouse connection catalog entry without persisting raw secrets', async () => {
    const repository = new MemoryWorkspaceFileRepository({});
    const catalog = new WorkspaceWarehouseConnectionCatalog({ repository });

    const created = await catalog.createConnection({
      name: 'Finance warehouse',
      type: 'postgres',
      database: 'finance',
      credentialRef: 'env:DVT_FINANCE_WAREHOUSE_URL',
      tables: [
        {
          database: 'finance',
          schema: 'erp',
          table: 'orders',
          rowCount: 128,
          byteSize: 4096000,
          columns: [{ name: 'id', type: 'integer', nullable: false }],
        },
      ],
    });

    expect(created).toEqual({
      id: 'finance-warehouse',
      name: 'Finance warehouse',
      type: 'postgres',
      database: 'finance',
    });
    expect(repository.savedFiles[WORKSPACE_WAREHOUSE_CONNECTION_CATALOG_PATH]).toContain(
      '"credentialRef": "env:DVT_FINANCE_WAREHOUSE_URL"'
    );
    expect(repository.savedFiles[WORKSPACE_WAREHOUSE_CONNECTION_CATALOG_PATH]).not.toContain(
      'password'
    );
    await expect(catalog.listTables('finance-warehouse')).resolves.toEqual([
      {
        database: 'finance',
        schema: 'erp',
        table: 'orders',
        rowCount: 128,
        byteSize: 4096000,
        columns: [{ name: 'id', type: 'integer', nullable: false }],
      },
    ]);
  });

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
                byteSize: 4096000,
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
        byteSize: 4096000,
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
