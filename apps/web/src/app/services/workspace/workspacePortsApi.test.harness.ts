/** Owned concern: build API workspace port harnesses with named narrow ports. */
import {
  createApiWarehouseSourceImportPort,
  createApiWorkspaceAdminReadPort,
  createApiWorkspaceDiffQueryPort,
  createApiWorkspaceFileContentCommandPort,
  createApiWorkspaceFilesQueryPort,
  createApiWorkspaceGraphSnapshotQueryPort,
  createApiWorkspacePluginCatalogQueryPort,
} from './workspacePorts.api';
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
    workspaceDiffQuery: createApiWorkspaceDiffQueryPort(apiClient),
    workspacePluginCatalogQuery: createApiWorkspacePluginCatalogQueryPort(),
    workspaceAdminRead: createApiWorkspaceAdminReadPort(),
    warehouseSourceImport: createApiWarehouseSourceImportPort(),
    workspaceFileContentCommand: createApiWorkspaceFileContentCommandPort(),
  };
}
