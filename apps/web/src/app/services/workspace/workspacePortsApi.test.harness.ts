/** Owned concern: build API workspace port harnesses with named narrow ports. */
import { vi } from 'vitest';

import {
  createApiWarehouseSourceImportPort,
  createApiWarehouseSourceDataSampleQueryPort,
  createApiWorkspaceAdminReadPort,
  createApiWorkspaceDiffQueryPort,
  createApiWorkspaceFileContentCommandPort,
  createApiWorkspaceFileHistoryQueryPort,
  createApiWorkspaceFilesQueryPort,
  createApiWorkspaceGraphSnapshotQueryPort,
} from './workspacePorts.api';
import type { FrontendOperabilitySink } from '../../ports/frontendOperability';
import { createApiWorkspacePluginCatalogQueryPort } from './workspacePluginCatalog.api';
import { createApiClientHarness } from './workspaceApiClient.test.harness';

export function createApiWorkspacePortHarness(
  options: Parameters<typeof createApiClientHarness>[0] = {},
  frontendOperabilitySink: FrontendOperabilitySink = { record: vi.fn() }
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
    warehouseSourceImport: createApiWarehouseSourceImportPort(apiClient, frontendOperabilitySink),
    warehouseSourceDataSampleQuery: createApiWarehouseSourceDataSampleQueryPort(
      apiClient,
      frontendOperabilitySink
    ),
    workspaceFileContentCommand: createApiWorkspaceFileContentCommandPort(apiClient),
  };
}
