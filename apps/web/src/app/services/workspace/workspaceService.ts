import type { IWorkspacePort } from '../../ports/workspace';
import { type ApiClient, createApiClient } from '../api/createApiClient';
import type { DataSourceMode } from '../config/dataSource';
import { apiWorkspaceServiceCapabilities, createApiWorkspaceService } from './workspaceService.api';
import {
  createMockWorkspaceService,
  mockWorkspaceServiceCapabilities,
} from './workspaceService.mock';

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

export type WorkspaceServiceCapabilities = {
  sourceImportAvailable: boolean;
};

export function resolveWorkspaceServiceCapabilities(
  mode: DataSourceMode
): WorkspaceServiceCapabilities {
  return mode === 'api' ? apiWorkspaceServiceCapabilities : mockWorkspaceServiceCapabilities;
}

export function createWorkspaceService(
  mode: DataSourceMode,
  apiClient: ApiClient = createApiClient()
): IWorkspacePort {
  if (mode === 'api') {
    return createApiWorkspaceService(apiClient);
  }

  return createMockWorkspaceService();
}
