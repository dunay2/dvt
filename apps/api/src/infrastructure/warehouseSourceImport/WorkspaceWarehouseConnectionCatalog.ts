/** Owned concern: read warehouse source-import catalog metadata from workspace-owned files. */
import {
  SourceObjectListSchema,
  type SourceObject,
  type WorkspaceGraphDraftScope,
} from '@dvt/contracts';
import { z } from 'zod';

import type {
  CreateWarehouseConnectionCatalogInput,
  IWarehouseConnectionCatalog,
  WarehouseConnection,
  WarehouseConnectionCatalogEntry,
} from '../../application/ports/warehouseSourceImport.js';
import {
  DuplicateWarehouseConnectionError,
  SUPPORTED_WAREHOUSE_CONNECTION_TYPES,
  WarehouseConnectionNotFoundError,
} from '../../application/ports/warehouseSourceImport.js';
import type {
  IWorkspaceFileRepository,
  WorkspaceFileContent,
} from '../../application/ports/workspaceFiles.js';
import {
  WorkspaceFileNotFoundError,
  WorkspaceFileRevisionConflictError,
} from '../../application/ports/workspaceFiles.js';

export const WORKSPACE_WAREHOUSE_CONNECTION_CATALOG_PATH = '.dvt/warehouse-connections.json';

export const WarehouseConnectionCatalogSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(SUPPORTED_WAREHOUSE_CONNECTION_TYPES),
  database: z.string().min(1),
  credentialRef: z.string().min(1).optional(),
  sourceObjects: z.array(z.unknown()),
});

export const WorkspaceWarehouseConnectionCatalogSchema = z.object({
  connections: z.array(WarehouseConnectionCatalogSchema),
});

export class WorkspaceWarehouseConnectionCatalog implements IWarehouseConnectionCatalog {
  public constructor(private readonly options: { readonly repository: IWorkspaceFileRepository }) {}

  public async listConnections(
    scope: WorkspaceGraphDraftScope
  ): Promise<readonly WarehouseConnection[]> {
    const entries = await resolveWorkspaceWarehouseCatalog(this.options.repository, scope);
    return entries.map(({ sourceObjects: _sourceObjects, ...connection }) => connection);
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
    const entries = await resolveWorkspaceWarehouseCatalog(this.options.repository, scope);
    const connection = entries.find((entry) => entry.id === connectionId);
    if (!connection) {
      throw new WarehouseConnectionNotFoundError(connectionId);
    }

    return connection;
  }

  public async createConnection(
    scope: WorkspaceGraphDraftScope,
    input: CreateWarehouseConnectionCatalogInput
  ): Promise<WarehouseConnection> {
    const currentFile = await readWorkspaceWarehouseCatalogFile(this.options.repository, scope);
    const entries = currentFile ? [...parseWorkspaceWarehouseCatalog(currentFile.content)] : [];
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
      sourceObjects: input.sourceObjects,
    });
    const nextEntries = [...entries, nextEntry].sort((left, right) =>
      left.name.localeCompare(right.name)
    );
    const saveResult = await this.options.repository.saveFileContent(scope, {
      path: WORKSPACE_WAREHOUSE_CONNECTION_CATALOG_PATH,
      content: serializeWorkspaceWarehouseCatalog(nextEntries),
      expectedRevision: currentFile
        ? { kind: 'content_sha256', value: currentFile.contentSha256 }
        : { kind: 'absent' },
    });
    if (saveResult.kind === 'conflict') {
      throw new WorkspaceFileRevisionConflictError(
        WORKSPACE_WAREHOUSE_CONNECTION_CATALOG_PATH,
        saveResult.currentContentSha256
      );
    }

    const {
      sourceObjects: _sourceObjects,
      credentialRef: _credentialRef,
      ...connection
    } = nextEntry;
    return connection;
  }
}

export async function resolveWorkspaceWarehouseCatalog(
  repository: IWorkspaceFileRepository,
  scope: WorkspaceGraphDraftScope
): Promise<readonly WarehouseConnectionCatalogEntry[]> {
  const file = await readWorkspaceWarehouseCatalogFile(repository, scope);
  return file ? parseWorkspaceWarehouseCatalog(file.content) : [];
}

async function readWorkspaceWarehouseCatalogFile(
  repository: IWorkspaceFileRepository,
  scope: WorkspaceGraphDraftScope
): Promise<WorkspaceFileContent | null> {
  try {
    return await repository.getFileContent(scope, WORKSPACE_WAREHOUSE_CONNECTION_CATALOG_PATH);
  } catch (error) {
    if (error instanceof WorkspaceFileNotFoundError) {
      return null;
    }
    throw error;
  }
}

function parseWorkspaceWarehouseCatalog(raw: string): readonly WarehouseConnectionCatalogEntry[] {
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
        sourceObjects: SourceObjectListSchema.parse(entry.sourceObjects),
      });
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function buildCatalogSourceObjectKey(sourceObject: SourceObject): string {
  return sourceObject.objectId;
}

export function normalizeCatalogEntry(
  entry: WarehouseConnectionCatalogEntry
): WarehouseConnectionCatalogEntry {
  const objectKeys = new Set<string>();
  const sourceObjects = SourceObjectListSchema.parse(entry.sourceObjects)
    .map((sourceObject) => {
      const objectKey = buildCatalogSourceObjectKey(sourceObject);
      if (objectKeys.has(objectKey)) {
        throw new Error(`Duplicate source object in workspace catalog: ${objectKey}`);
      }
      objectKeys.add(objectKey);
      return sourceObject;
    })
    .sort((left, right) =>
      buildCatalogSourceObjectKey(left).localeCompare(buildCatalogSourceObjectKey(right))
    );

  return { ...entry, sourceObjects };
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
