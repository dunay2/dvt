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

export type WorkspaceGraphSnapshot = {
  nodes: DbtNode[];
  edges: DbtEdge[];
};

export type WorkspaceGraphDraft = {
  canvas: {
    kind: string;
    title: string;
  };
  nodeIds: string[];
  nodePositions: Record<string, { x: number; y: number }>;
  edges: Array<{ sourceId: string; targetId: string }>;
};

export type WorkspaceGraphDraftRecord = {
  revision: string;
  draft: WorkspaceGraphDraft;
  savedAt: string;
};

export type SaveWorkspaceGraphDraftInput = {
  expectedRevision: string | null;
  idempotencyKey: string;
  draft: WorkspaceGraphDraft;
};

export type SaveWorkspaceGraphDraftResult =
  | {
      outcome: 'saved';
      record: WorkspaceGraphDraftRecord;
    }
  | {
      outcome: 'conflict';
      current: WorkspaceGraphDraftRecord;
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
 * Port interface for workspace operations consumed by the presentation layer.
 *
 * Implementations (mock, API) satisfy this contract through adapters wired
 * in the composition root. Views and hooks depend only on this interface.
 */
export interface IWorkspacePort {
  getGraphSnapshot: () => Promise<WorkspaceGraphSnapshot>;
  getDiffChanges: () => Promise<DiffChange[]>;
  getPlugins: () => Promise<Plugin[]>;
  getRoles: () => Promise<Role[]>;
  getAuditLog: () => Promise<AuditLogEntry[]>;
  listWarehouseConnections: () => Promise<WarehouseConnection[]>;
  listWarehouseTables: (connectionId: string) => Promise<WarehouseTable[]>;
  importSources: (input: ImportSourcesInput) => Promise<ImportSourcesResult>;
  listFiles: () => Promise<WorkspaceFileEntry[]>;
  getFileContent: (path: string) => Promise<FileContent>;
  saveFileContent: (path: string, content: string) => Promise<FileContent>;
}
