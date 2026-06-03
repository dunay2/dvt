/** Owned concern: build API workspace port harnesses with named narrow ports. */
import {
  createApiWarehouseSourceImportPort,
  createApiWorkspaceAdminReadPort,
  createApiWorkspaceDiffQueryPort,
  createApiWorkspaceFileContentCommandPort,
  createApiWorkspaceFileHistoryQueryPort,
  createApiWorkspaceFilesQueryPort,
  createApiWorkspaceGraphSnapshotQueryPort,
} from './workspacePorts.api';
import { createApiWorkspacePluginCatalogQueryPort } from './workspacePluginCatalog.api';
import { createApiClientHarness } from './workspaceApiClient.test.harness';

export function createApiWorkspacePortHarness(
  options: Parameters<typeof createApiClientHarness>[0] = {}
) {
  const { apiClient, requestRaw, getJson, postJson } = createApiClientHarness(options);

  return {
    requestRaw,
    getJson,
    postJson,
    workspaceGraphSnapshotQuery: createApiWorkspaceGraphSnapshotQueryPort(apiClient),
    workspaceFilesQuery: createApiWorkspaceFilesQueryPort(apiClient),
    workspaceFileHistoryQuery: createApiWorkspaceFileHistoryQueryPort(apiClient),
    workspaceDiffQuery: createApiWorkspaceDiffQueryPort(apiClient),
    workspacePluginCatalogQuery: createApiWorkspacePluginCatalogQueryPort(apiClient),
    workspaceAdminRead: createApiWorkspaceAdminReadPort(),
    warehouseSourceImport: createApiWarehouseSourceImportPort(apiClient),
    workspaceFileContentCommand: createApiWorkspaceFileContentCommandPort(apiClient),
  };
}
