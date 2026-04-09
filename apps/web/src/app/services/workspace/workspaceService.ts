import type { IWorkspacePort } from '../../ports/workspace';
import { type ApiClient, createApiClient } from '../api/createApiClient';
import type { DataSourceMode } from '../config/dataSource';
import { createApiWorkspaceService } from './workspaceService.api';
import { createMockWorkspaceService } from './workspaceService.mock';

// Re-export port types for backward compatibility — consumers should migrate
// to importing from '../../ports/workspace' or '../../ports' directly.
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

/**
 * @deprecated Use {@link IWorkspacePort} from `../../ports/workspace` instead.
 */
export type WorkspaceService = IWorkspacePort;

export function createWorkspaceService(
  mode: DataSourceMode,
  apiClient: ApiClient = createApiClient()
): IWorkspacePort {
  if (mode === 'api') {
    return createApiWorkspaceService(apiClient);
  }

  return createMockWorkspaceService();
}
