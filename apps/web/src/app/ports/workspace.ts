/** Owned concern: define web-facing workspace DTOs and capability-specific ports. */
import type { AuditLogEntry, DbtEdge, DbtNode, DiffChange, Plugin, Role } from '../types/dbt';

// ---------------------------------------------------------------------------
// Presentation-facing DTOs for the workspace domain
// ---------------------------------------------------------------------------

export type FileContent = {
  path: string;
  name: string;
  language: string;
  content: string;
  lastModified: string;
};

export type WorkspaceFileEntry = {
  path: string;
  name: string;
  kind: 'file' | 'directory';
  children?: WorkspaceFileEntry[];
};

export type WorkspaceFileHistoryEntry = {
  commitSha: string;
  shortSha: string;
  authorName: string;
  authoredAt: string;
  subject: string;
  path: string;
};

export type WorkspaceGraphSnapshot = {
  nodes: DbtNode[];
  edges: DbtEdge[];
};

export type WarehouseConnection = {
  id: string;
  name: string;
  type: 'snowflake' | 'bigquery' | 'redshift' | 'postgres';
  database: string;
};

export type WarehouseColumn = {
  name: string;
  type: string;
  nullable: boolean;
};

export type WarehouseTable = {
  database: string;
  schema: string;
  table: string;
  rowCount?: number;
  columns?: WarehouseColumn[];
};

export type SourceImportGrouping = 'schema' | 'database' | 'custom';

export type ImportSourcesInput = {
  connectionId: string;
  tables: WarehouseTable[];
  groupingStrategy: SourceImportGrouping;
  includeColumns: boolean;
  addTests: boolean;
  addFreshness: boolean;
};

export type ImportSourcesResult = {
  success: true;
  sourcesCreated: number;
  tablesImported: number;
  yamlFiles: string[];
  importedNodeIds?: string[];
  grouping: SourceImportGrouping;
  options: {
    includeColumns: boolean;
    addTests: boolean;
    addFreshness: boolean;
  };
};

// ---------------------------------------------------------------------------
// Workspace port — presentation-layer contract for workspace operations
// ---------------------------------------------------------------------------

/**
 * Presentation graph snapshot query port.
 *
 * Implementations project protected graph draft read models without exposing
 * file, diff, admin, plugin, import, or write capabilities.
 */
export interface IWorkspaceGraphSnapshotQueryPort {
  getGraphSnapshot: () => Promise<WorkspaceGraphSnapshot>;
}

/** Owns read-only workspace file tree and content access. */
export interface IWorkspaceFilesQueryPort {
  listFiles: () => Promise<WorkspaceFileEntry[]>;
  getFileContent: (path: string) => Promise<FileContent>;
}

/** Owns read-only, file-scoped Git history access for workspace files. */
export interface IWorkspaceFileHistoryQueryPort {
  getFileHistory: (path: string) => Promise<WorkspaceFileHistoryEntry[]>;
}

/** Owns workspace diff read-model access for diff presentation consumers. */
export interface IWorkspaceDiffQueryPort {
  getDiffChanges: () => Promise<DiffChange[]>;
}

/** Owns runtime plugin catalog/readiness reads for plugin presentation consumers. */
export interface IWorkspacePluginCatalogQueryPort {
  getPlugins: () => Promise<Plugin[]>;
}

/** Owns admin RBAC and audit read-model access for admin presentation consumers. */
export interface IWorkspaceAdminReadPort {
  getRoles: () => Promise<Role[]>;
  getAuditLog: () => Promise<AuditLogEntry[]>;
}

/** Owns warehouse source discovery queries and source import command access. */
export interface IWarehouseSourceImportPort {
  listWarehouseConnections: () => Promise<WarehouseConnection[]>;
  listWarehouseTables: (connectionId: string) => Promise<WarehouseTable[]>;
  importSources: (input: ImportSourcesInput) => Promise<ImportSourcesResult>;
}

/** Owns workspace file content writes when an accepted backend command exists. */
export interface IWorkspaceFileContentCommandPort {
  saveFileContent: (path: string, content: string) => Promise<FileContent>;
}
