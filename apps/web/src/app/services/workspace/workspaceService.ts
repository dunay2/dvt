import type { IWorkspacePort } from '../../ports/workspace';
import { type ApiClient, createApiClient } from '../api/createApiClient';
import type { DataSourceMode } from '../config/dataSource';
import { createApiWorkspaceService } from './workspaceService.api';
import { createMockWorkspaceService } from './workspaceService.mock';

export type {
  WorkspaceGraphSnapshot,
  WorkspaceGraphDraft,
  WorkspaceGraphDraftRecord,
  SaveWorkspaceGraphDraftInput,
  SaveWorkspaceGraphDraftResult,
  WarehouseConnection,
  WarehouseColumn,
  WarehouseTable,
  SourceImportGrouping,
  ImportSourcesInput,
  ImportSourcesResult,
  FileContent,
  WorkspaceFileEntry,
} from '../../ports/workspace';

export function createWorkspaceService(
  mode: DataSourceMode,
  apiClient: ApiClient = createApiClient()
): IWorkspacePort {
  if (mode === 'api') {
    return createApiWorkspaceService(apiClient);
  }

  return createMockWorkspaceService();
}
