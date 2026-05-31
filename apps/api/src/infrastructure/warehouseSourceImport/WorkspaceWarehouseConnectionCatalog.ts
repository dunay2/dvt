/** Owned concern: read warehouse source-import catalog metadata from workspace-owned files. */
import { z } from 'zod';

import type {
  IWarehouseConnectionCatalog,
  WarehouseConnection,
  WarehouseConnectionCatalogEntry,
  WarehouseTable,
} from '../../application/ports/warehouseSourceImport.js';
import { WarehouseConnectionNotFoundError } from '../../application/ports/warehouseSourceImport.js';
import type { IWorkspaceFileRepository } from '../../application/ports/workspaceFiles.js';
import { WorkspaceFileNotFoundError } from '../../application/ports/workspaceFiles.js';

export const WORKSPACE_WAREHOUSE_CONNECTION_CATALOG_PATH = '.dvt/warehouse-connections.json';

export const WarehouseColumnCatalogSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  nullable: z.boolean(),
});

export const WarehouseTableCatalogSchema = z.object({
  database: z.string().min(1),
  schema: z.string().min(1),
  table: z.string().min(1),
  rowCount: z.number().nonnegative().optional(),
  columns: z.array(WarehouseColumnCatalogSchema).optional(),
});

export const WarehouseConnectionCatalogSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['snowflake', 'bigquery', 'redshift', 'postgres']),
  database: z.string().min(1),
  tables: z.array(WarehouseTableCatalogSchema),
});

export const WorkspaceWarehouseConnectionCatalogSchema = z.object({
  connections: z.array(WarehouseConnectionCatalogSchema),
});

export class WorkspaceWarehouseConnectionCatalog implements IWarehouseConnectionCatalog {
  public constructor(private readonly options: { readonly repository: IWorkspaceFileRepository }) {}

  public async listConnections(): Promise<readonly WarehouseConnection[]> {
    const entries = await resolveWorkspaceWarehouseCatalog(this.options.repository);
    return entries.map(({ tables: _tables, ...connection }) => connection);
  }

  public async listTables(connectionId: string): Promise<readonly WarehouseTable[]> {
    const entries = await resolveWorkspaceWarehouseCatalog(this.options.repository);
    const connection = entries.find((entry) => entry.id === connectionId);
    if (!connection) {
      throw new WarehouseConnectionNotFoundError(connectionId);
    }

    return connection.tables;
  }
}

export async function resolveWorkspaceWarehouseCatalog(
  repository: IWorkspaceFileRepository
): Promise<readonly WarehouseConnectionCatalogEntry[]> {
  let raw: string;
  try {
    raw = (await repository.getFileContent(WORKSPACE_WAREHOUSE_CONNECTION_CATALOG_PATH)).content;
  } catch (error) {
    if (error instanceof WorkspaceFileNotFoundError) {
      return [];
    }
    throw error;
  }

  const parsed = WorkspaceWarehouseConnectionCatalogSchema.parse(JSON.parse(raw));
  const connectionIds = new Set<string>();
  return parsed.connections
    .map((entry) => {
      if (connectionIds.has(entry.id)) {
        throw new Error(`Duplicate warehouse connection in workspace catalog: ${entry.id}`);
      }
      connectionIds.add(entry.id);
      return normalizeCatalogEntry({
        id: entry.id,
        name: entry.name,
        type: entry.type,
        database: entry.database,
        tables: entry.tables.map(
          (table): WarehouseTable => ({
            database: table.database,
            schema: table.schema,
            table: table.table,
            ...(table.rowCount !== undefined ? { rowCount: table.rowCount } : {}),
            ...(table.columns !== undefined ? { columns: table.columns } : {}),
          })
        ),
      });
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function buildCatalogTableKey(table: WarehouseTable): string {
  return `${table.database.toLowerCase()}.${table.schema.toLowerCase()}.${table.table.toLowerCase()}`;
}

export function normalizeCatalogEntry(
  entry: WarehouseConnectionCatalogEntry
): WarehouseConnectionCatalogEntry {
  const tableKeys = new Set<string>();
  const tables = entry.tables
    .map((table) => {
      const tableKey = buildCatalogTableKey(table);
      if (tableKeys.has(tableKey)) {
        throw new Error(`Duplicate warehouse table in workspace catalog: ${tableKey}`);
      }
      tableKeys.add(tableKey);
      return table;
    })
    .sort((left, right) => buildCatalogTableKey(left).localeCompare(buildCatalogTableKey(right)));

  return { ...entry, tables };
}
