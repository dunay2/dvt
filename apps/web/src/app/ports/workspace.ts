/** Owned concern: define web-facing workspace DTOs and capability-specific ports. */
import {
  SOURCE_IMPORT_GROUPING,
  WAREHOUSE_CONNECTION_TYPE,
  type CanvasAuthoringAuthorityResolution,
  type ConnectionRef,
  type CreateWarehouseConnectionRequest,
  type ImportSourceObjectsRequestV2,
  type ImportSourceObjectsResultV2,
  type RenameWarehouseConnectionRequest,
  type SourceDataSampleRequest,
  type SourceDataSampleResponse,
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
  contentSha256: string;
  lastModified: string;
};

export type ExpectedWorkspaceFileRevision =
  { readonly kind: 'absent' } | { readonly kind: 'content_sha256'; readonly value: string };

export type SaveWorkspaceFileContentInput = {
  readonly path: string;
  readonly content: string;
  readonly expectedRevision: ExpectedWorkspaceFileRevision;
};

export type WorkspaceFileSaveReceipt =
  | {
      readonly kind: 'saved';
      readonly disposition: 'created' | 'updated';
      readonly path: string;
      readonly contentSha256: string;
      readonly lastModified: string;
    }
  | {
      readonly kind: 'unchanged';
      readonly disposition: null;
      readonly path: string;
      readonly contentSha256: string;
      readonly lastModified: string;
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
  authoringAuthority: CanvasAuthoringAuthorityResolution;
};

export const SUPPORTED_WAREHOUSE_CONNECTION_TYPES = WAREHOUSE_CONNECTION_TYPE;

export type WarehouseConnectionType = ContractWarehouseConnectionType;

export type WarehouseConnection = ContractWarehouseConnection;

export type CreateWarehouseConnectionInput = CreateWarehouseConnectionRequest;

export type RenameWarehouseConnectionInput = RenameWarehouseConnectionRequest;

export type TestWarehouseConnectionResult = ContractTestWarehouseConnectionResult;

export const SUPPORTED_SOURCE_IMPORT_GROUPINGS = SOURCE_IMPORT_GROUPING;

export type SourceImportGrouping = ImportSourceObjectsRequestV2['groupingStrategy'];

export type ImportSourcesInput = ImportSourceObjectsRequestV2;

export type ImportSourcesResult = ImportSourceObjectsResultV2;

export type PreviewSourceObjectRowsInput = SourceDataSampleRequest;

export type SourceDataSample = SourceDataSampleResponse;

export type PostgresTransformSqlDiagnosticCode =
  | 'sql_required'
  | 'syntax_error'
  | 'multiple_statements'
  | 'unsupported_statement'
  | 'undefined_table'
  | 'undefined_column'
  | 'postgres_error'
  | 'connection_unavailable';

export type PostgresTransformSqlDiagnostic = Readonly<{
  code: PostgresTransformSqlDiagnosticCode;
  source: 'policy' | 'parser' | 'postgres' | 'connection';
  message: string;
  startOffset?: number;
  endOffset?: number;
}>;

export type PostgresTransformSqlValidationResult =
  | Readonly<{ status: 'valid' }>
  | Readonly<{
      status: 'invalid' | 'unavailable';
      diagnostics: readonly PostgresTransformSqlDiagnostic[];
    }>;

export type ValidatePostgresTransformSqlInput = Readonly<{
  connectionRef: ConnectionRef;
  sql: string;
}>;

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
  renameWarehouseConnection: (
    connectionId: string,
    input: RenameWarehouseConnectionInput
  ) => Promise<WarehouseConnection>;
  testWarehouseConnection: (connectionId: string) => Promise<TestWarehouseConnectionResult>;
  validatePostgresTransformSql: (
    input: ValidatePostgresTransformSqlInput
  ) => Promise<PostgresTransformSqlValidationResult>;
  importSources: (input: ImportSourcesInput) => Promise<ImportSourcesResult>;
}

/** Owns the bounded, read-only warehouse source data sample query. */
export interface IWarehouseSourceDataSampleQueryPort {
  previewSourceObjectRows: (input: PreviewSourceObjectRowsInput) => Promise<SourceDataSample>;
}

/** Owns workspace file content writes when an accepted backend command exists. */
export interface IWorkspaceFileContentCommandPort {
  saveFileContent: (input: SaveWorkspaceFileContentInput) => Promise<WorkspaceFileSaveReceipt>;
}
