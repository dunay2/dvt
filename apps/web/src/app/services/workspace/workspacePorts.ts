/** Owned concern: compose workspace capability ports for the web composition root. */
import type {
  IWarehouseSourceImportPort,
  IWarehouseSourceDataSampleQueryPort,
  IWorkspaceAdminReadPort,
  IWorkspaceDiffQueryPort,
  IWorkspaceFileContentCommandPort,
  IWorkspaceFileHistoryQueryPort,
  IWorkspaceFileVersionCommandPort,
  IWorkspaceFileDirectoryQueryPort,
  IWorkspaceFilesQueryPort,
  IWorkspaceGraphSnapshotQueryPort,
  IWorkspacePluginCatalogQueryPort,
} from '../../ports/workspace';
import type { FrontendOperabilitySink } from '../../ports/frontendOperability';
import type { ApiClient } from '../api/createApiClient';
import { createApiWorkspacePluginCatalogQueryPort } from './workspacePluginCatalog.api';
import {
  createApiWarehouseSourceImportPort,
  createApiWarehouseSourceDataSampleQueryPort,
  createApiWorkspaceAdminReadPort,
  createApiWorkspaceDiffQueryPort,
  createApiWorkspaceFileContentCommandPort,
  createApiWorkspaceFileDirectoryQueryPort,
  createApiWorkspaceFileHistoryQueryPort,
  createApiWorkspaceFileVersionCommandPort,
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

export type WorkspacePorts = {
  readonly workspaceGraphSnapshotQuery: IWorkspaceGraphSnapshotQueryPort;
  readonly workspaceFilesQuery: IWorkspaceFilesQueryPort;
  readonly workspaceFileDirectoryQuery: IWorkspaceFileDirectoryQueryPort;
  readonly workspaceFileHistoryQuery: IWorkspaceFileHistoryQueryPort;
  readonly workspaceFileVersionCommand: IWorkspaceFileVersionCommandPort;
  readonly workspaceDiffQuery: IWorkspaceDiffQueryPort;
  readonly workspacePluginCatalogQuery: IWorkspacePluginCatalogQueryPort;
  readonly workspaceAdminRead: IWorkspaceAdminReadPort;
  readonly warehouseSourceImport: IWarehouseSourceImportPort;
  readonly warehouseSourceDataSampleQuery: IWarehouseSourceDataSampleQueryPort;
  readonly workspaceFileContentCommand: IWorkspaceFileContentCommandPort;
};

export function createWorkspacePorts(
  apiClient: ApiClient,
  frontendOperabilitySink: FrontendOperabilitySink
): WorkspacePorts {
  return {
    workspaceGraphSnapshotQuery: createApiWorkspaceGraphSnapshotQueryPort(apiClient),
    workspaceFilesQuery: createApiWorkspaceFilesQueryPort(apiClient),
    workspaceFileDirectoryQuery: createApiWorkspaceFileDirectoryQueryPort(apiClient),
    workspaceFileHistoryQuery: createApiWorkspaceFileHistoryQueryPort(apiClient),
    workspaceFileVersionCommand: createApiWorkspaceFileVersionCommandPort(apiClient),
    workspaceDiffQuery: createApiWorkspaceDiffQueryPort(apiClient),
    workspacePluginCatalogQuery: createApiWorkspacePluginCatalogQueryPort(apiClient),
    workspaceAdminRead: createApiWorkspaceAdminReadPort(),
    warehouseSourceImport: createApiWarehouseSourceImportPort(apiClient, frontendOperabilitySink),
    warehouseSourceDataSampleQuery: createApiWarehouseSourceDataSampleQueryPort(
      apiClient,
      frontendOperabilitySink
    ),
    workspaceFileContentCommand: createApiWorkspaceFileContentCommandPort(apiClient),
  };
}
