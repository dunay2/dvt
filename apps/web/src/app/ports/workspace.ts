/** Owned concern: define web-facing workspace DTOs and capability-specific ports. */
import {
  SOURCE_IMPORT_GROUPING,
  WAREHOUSE_CONNECTION_TYPE,
  type CreateWarehouseConnectionRequest,
  type ImportSourceObjectsRequest,
  type ImportSourceObjectsResult,
  type SourceObject,
  type TestWarehouseConnectionResult as ContractTestWarehouseConnectionResult,
  type WarehouseConnection as ContractWarehouseConnection,
  type WarehouseConnectionType as ContractWarehouseConnectionType,
} from '@dvt/contracts';

import type { AuditLogEntry, DbtEdge, DbtNode, DiffChange, Plugin, Role } from '../types/dbt';

export type {
  RelationalSourceObject,
  RelationalSourceObjectLocator,
  SourceObject,
  SourceObjectByteSizeBasis,
  SourceObjectByteSizeMetricValue,
  SourceObjectColumn,
  SourceObjectMetricConfidence,
  SourceObjectMetricEvidence,
  SourceObjectMetricMethod,
  SourceObjectMetricObservationScope,
  SourceObjectMetricProvenance,
  SourceObjectRowCountMetric,
  SourceObjectSelection,
} from '@dvt/contracts';

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

export const SUPPORTED_WAREHOUSE_CONNECTION_TYPES = WAREHOUSE_CONNECTION_TYPE;

export type WarehouseConnectionType = ContractWarehouseConnectionType;

export type WarehouseConnection = ContractWarehouseConnection;

export type CreateWarehouseConnectionInput = CreateWarehouseConnectionRequest;

export type TestWarehouseConnectionResult = ContractTestWarehouseConnectionResult;

export const SUPPORTED_SOURCE_IMPORT_GROUPINGS = SOURCE_IMPORT_GROUPING;

export type SourceImportGrouping = ImportSourceObjectsRequest['groupingStrategy'];

export type ImportSourcesInput = ImportSourceObjectsRequest;

export type ImportSourcesResult = ImportSourceObjectsResult;

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
  listSourceObjects: (connectionId: string) => Promise<SourceObject[]>;
  createWarehouseConnection: (
    input: CreateWarehouseConnectionInput
  ) => Promise<WarehouseConnection>;
  testWarehouseConnection: (connectionId: string) => Promise<TestWarehouseConnectionResult>;
  importSources: (input: ImportSourcesInput) => Promise<ImportSourcesResult>;
}

/** Owns workspace file content writes when an accepted backend command exists. */
export interface IWorkspaceFileContentCommandPort {
  saveFileContent: (path: string, content: string) => Promise<FileContent>;
}
