/** Owned concern: compose workspace capability ports for the web composition root. */
import type {
  IWarehouseSourceImportPort,
  IWorkspaceAdminReadPort,
  IWorkspaceDiffQueryPort,
  IWorkspaceFileContentCommandPort,
  IWorkspaceFilesQueryPort,
  IWorkspaceGraphSnapshotQueryPort,
  IWorkspacePluginCatalogQueryPort,
} from '../../ports/workspace';
import { type ApiClient, createApiClient } from '../api/createApiClient';
import type { DataSourceMode } from '../config/dataSource';
import {
  apiWorkspacePortCapabilities,
  createApiWarehouseSourceImportPort,
  createApiWorkspaceAdminReadPort,
  createApiWorkspaceDiffQueryPort,
  createApiWorkspaceFileContentCommandPort,
  createApiWorkspaceFilesQueryPort,
  createApiWorkspaceGraphSnapshotQueryPort,
  createApiWorkspacePluginCatalogQueryPort,
} from './workspacePorts.api';
import { createMockWorkspacePorts, mockWorkspacePortCapabilities } from './workspacePorts.mock';

export type {
  WorkspaceGraphSnapshot,
  WarehouseConnection,
  WarehouseColumn,
  WarehouseTable,
  SourceImportGrouping,
  ImportSourcesInput,
  ImportSourcesResult,
  FileContent,
  WorkspaceFileEntry,
} from '../../ports/workspace';

export type WorkspacePortCapabilities = {
  sourceImportAvailable: boolean;
};

export type WorkspacePorts = {
  readonly workspaceGraphSnapshotQuery: IWorkspaceGraphSnapshotQueryPort;
  readonly workspaceFilesQuery: IWorkspaceFilesQueryPort;
  readonly workspaceDiffQuery: IWorkspaceDiffQueryPort;
  readonly workspacePluginCatalogQuery: IWorkspacePluginCatalogQueryPort;
  readonly workspaceAdminRead: IWorkspaceAdminReadPort;
  readonly warehouseSourceImport: IWarehouseSourceImportPort;
  readonly workspaceFileContentCommand: IWorkspaceFileContentCommandPort;
};

export function resolveWorkspacePortCapabilities(mode: DataSourceMode): WorkspacePortCapabilities {
  return mode === 'api' ? apiWorkspacePortCapabilities : mockWorkspacePortCapabilities;
}

export function createWorkspacePorts(
  mode: DataSourceMode,
  apiClient: ApiClient = createApiClient()
): WorkspacePorts {
  if (mode === 'api') {
    return {
      workspaceGraphSnapshotQuery: createApiWorkspaceGraphSnapshotQueryPort(apiClient),
      workspaceFilesQuery: createApiWorkspaceFilesQueryPort(apiClient),
      workspaceDiffQuery: createApiWorkspaceDiffQueryPort(),
      workspacePluginCatalogQuery: createApiWorkspacePluginCatalogQueryPort(),
      workspaceAdminRead: createApiWorkspaceAdminReadPort(),
      warehouseSourceImport: createApiWarehouseSourceImportPort(),
      workspaceFileContentCommand: createApiWorkspaceFileContentCommandPort(),
    };
  }

  return createMockWorkspacePorts();
}
