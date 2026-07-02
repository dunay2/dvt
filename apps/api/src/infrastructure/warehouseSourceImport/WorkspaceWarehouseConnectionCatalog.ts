/** Owned concern: read warehouse source-import catalog metadata from workspace-owned files. */
import { z } from 'zod';

import type {
  CreateWarehouseConnectionCatalogInput,
  IWarehouseConnectionCatalog,
  WarehouseConnection,
  WarehouseConnectionCatalogEntry,
  WarehouseTable,
} from '../../application/ports/warehouseSourceImport.js';
import {
  DuplicateWarehouseConnectionError,
  WarehouseConnectionNotFoundError,
} from '../../application/ports/warehouseSourceImport.js';
import type { IWorkspaceFileRepository } from '../../application/ports/workspaceFiles.js';
import { WorkspaceFileNotFoundError } from '../../application/ports/workspaceFiles.js';

export const WORKSPACE_WAREHOUSE_CONNECTION_CATALOG_PATH = '.dvt/warehouse-connections.json';

export const WarehouseColumnCatalogSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  nullable: z.boolean(),
  primaryKey: z.boolean().optional(),
  unique: z.boolean().optional(),
});

export const WarehouseTableCatalogSchema = z.object({
  database: z.string().min(1),
  schema: z.string().min(1),
  table: z.string().min(1),
  rowCount: z.number().nonnegative().optional(),
  byteSize: z.number().nonnegative().optional(),
  columns: z.array(WarehouseColumnCatalogSchema).optional(),
});

export const WarehouseConnectionCatalogSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['snowflake', 'bigquery', 'redshift', 'postgres']),
  database: z.string().min(1),
  credentialRef: z.string().min(1).optional(),
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
    return (await this.getConnection(connectionId)).tables;
  }

  public async getConnection(connectionId: string): Promise<WarehouseConnectionCatalogEntry> {
    const entries = await resolveWorkspaceWarehouseCatalog(this.options.repository);
    const connection = entries.find((entry) => entry.id === connectionId);
    if (!connection) {
      throw new WarehouseConnectionNotFoundError(connectionId);
    }

    return connection;
  }

  public async createConnection(
    input: CreateWarehouseConnectionCatalogInput
  ): Promise<WarehouseConnection> {
    const entries = [...(await resolveWorkspaceWarehouseCatalog(this.options.repository))];
    const id = toWarehouseConnectionId(input.name);
    const normalizedName = input.name.trim().toLowerCase();

    if (
      entries.some(
        (entry) =>
          entry.id.toLowerCase() === id || entry.name.trim().toLowerCase() === normalizedName
      )
    ) {
      throw new DuplicateWarehouseConnectionError(input.name);
    }

    const nextEntry = normalizeCatalogEntry({
      id,
      name: input.name.trim(),
      type: input.type,
      database: input.database.trim(),
      credentialRef: input.credentialRef.trim(),
      tables: input.tables,
    });
    const nextEntries = [...entries, nextEntry].sort((left, right) =>
      left.name.localeCompare(right.name)
    );
    await this.options.repository.saveFileContent(
      WORKSPACE_WAREHOUSE_CONNECTION_CATALOG_PATH,
      serializeWorkspaceWarehouseCatalog(nextEntries)
    );

    const { tables: _tables, credentialRef: _credentialRef, ...connection } = nextEntry;
    return connection;
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
        ...(entry.credentialRef !== undefined ? { credentialRef: entry.credentialRef } : {}),
        tables: entry.tables.map(
          (table): WarehouseTable => ({
            database: table.database,
            schema: table.schema,
            table: table.table,
            ...(table.rowCount !== undefined ? { rowCount: table.rowCount } : {}),
            ...(table.byteSize !== undefined ? { byteSize: table.byteSize } : {}),
            ...(table.columns !== undefined
              ? {
                  columns: table.columns.map((column) => ({
                    name: column.name,
                    type: column.type,
                    nullable: column.nullable,
                    ...(typeof column.primaryKey === 'boolean'
                      ? { primaryKey: column.primaryKey }
                      : {}),
                    ...(typeof column.unique === 'boolean' ? { unique: column.unique } : {}),
                  })),
                }
              : {}),
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

export function toWarehouseConnectionId(name: string): string {
  const normalizedName = name.trim().toLowerCase();
  let connectionId = '';
  let previousWasSeparator = false;

  for (const char of normalizedName) {
    const isAllowed = (char >= 'a' && char <= 'z') || (char >= '0' && char <= '9');
    if (isAllowed) {
      connectionId += char;
      previousWasSeparator = false;
      continue;
    }

    if (connectionId.length > 0 && !previousWasSeparator) {
      connectionId += '-';
      previousWasSeparator = true;
    }
  }

  if (connectionId.endsWith('-')) {
    connectionId = connectionId.slice(0, -1);
  }

  return connectionId || 'warehouse-connection';
}

function serializeWorkspaceWarehouseCatalog(
  connections: readonly WarehouseConnectionCatalogEntry[]
): string {
  return `${JSON.stringify({ connections }, null, 2)}\n`;
}
