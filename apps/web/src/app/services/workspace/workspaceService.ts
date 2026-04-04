import type { AuditLogEntry, DbtEdge, DbtNode, DiffChange, Plugin, Role } from '../../types/dbt';
import { type ApiClient, createApiClient } from '../api/createApiClient';
import { resolveDataSource, type DataSourceMode } from '../config/dataSource';
import { createApiWorkspaceService } from './workspaceService.api';
import { createMockWorkspaceService } from './workspaceService.mock';

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
  grouping: SourceImportGrouping;
  options: {
    includeColumns: boolean;
    addTests: boolean;
    addFreshness: boolean;
  };
};

export interface WorkspaceService {
  getGraphSnapshot: () => Promise<WorkspaceGraphSnapshot>;
  getDiffChanges: () => Promise<DiffChange[]>;
  getPlugins: () => Promise<Plugin[]>;
  getRoles: () => Promise<Role[]>;
  getAuditLog: () => Promise<AuditLogEntry[]>;
  listWarehouseConnections: () => Promise<WarehouseConnection[]>;
  listWarehouseTables: (connectionId: string) => Promise<WarehouseTable[]>;
  importSources: (input: ImportSourcesInput) => Promise<ImportSourcesResult>;
}

export function createWorkspaceService(
  mode: DataSourceMode = resolveDataSource(),
  apiClient: ApiClient = createApiClient()
): WorkspaceService {
  if (mode === 'api') {
    return createApiWorkspaceService(apiClient);
  }

  return createMockWorkspaceService();
}
