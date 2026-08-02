/** Owned concern: compose workspace capability ports for the web composition root. */
import type {
  IWarehouseSourceImportPort,
  IWorkspaceAdminReadPort,
  IWorkspaceDiffQueryPort,
  IWorkspaceFileContentCommandPort,
  IWorkspaceFileHistoryQueryPort,
  IWorkspaceFilesQueryPort,
  IWorkspaceGraphSnapshotQueryPort,
  IWorkspacePluginCatalogQueryPort,
} from '../../ports/workspace';
import type { FrontendOperabilitySink } from '../../ports/frontendOperability';
import type { ApiClient } from '../api/createApiClient';
import { createApiWorkspacePluginCatalogQueryPort } from './workspacePluginCatalog.api';
import {
  apiWorkspacePortCapabilities,
  createApiWarehouseSourceImportPort,
  createApiWorkspaceAdminReadPort,
  createApiWorkspaceDiffQueryPort,
  createApiWorkspaceFileContentCommandPort,
  createApiWorkspaceFileHistoryQueryPort,
  createApiWorkspaceFilesQueryPort,
  createApiWorkspaceGraphSnapshotQueryPort,
} from './workspacePorts.api';

export type {
  WorkspaceGraphSnapshot,
  WarehouseConnection,
  SourceObject,
  SourceObjectColumn,
  SourceObjectSelection,
  RelationalSourceObject,
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
  readonly workspaceFileHistoryQuery: IWorkspaceFileHistoryQueryPort;
  readonly workspaceDiffQuery: IWorkspaceDiffQueryPort;
  readonly workspacePluginCatalogQuery: IWorkspacePluginCatalogQueryPort;
  readonly workspaceAdminRead: IWorkspaceAdminReadPort;
  readonly warehouseSourceImport: IWarehouseSourceImportPort;
  readonly workspaceFileContentCommand: IWorkspaceFileContentCommandPort;
};

export function resolveWorkspacePortCapabilities(): WorkspacePortCapabilities {
  return apiWorkspacePortCapabilities;
}

export function createWorkspacePorts(
  apiClient: ApiClient,
  frontendOperabilitySink: FrontendOperabilitySink
): WorkspacePorts {
  return {
    workspaceGraphSnapshotQuery: createApiWorkspaceGraphSnapshotQueryPort(apiClient),
    workspaceFilesQuery: createApiWorkspaceFilesQueryPort(apiClient),
    workspaceFileHistoryQuery: createApiWorkspaceFileHistoryQueryPort(apiClient),
    workspaceDiffQuery: createApiWorkspaceDiffQueryPort(apiClient),
    workspacePluginCatalogQuery: createApiWorkspacePluginCatalogQueryPort(apiClient),
    workspaceAdminRead: createApiWorkspaceAdminReadPort(),
    warehouseSourceImport: createApiWarehouseSourceImportPort(apiClient, frontendOperabilitySink),
    workspaceFileContentCommand: createApiWorkspaceFileContentCommandPort(apiClient),
  };
}
