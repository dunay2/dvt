import type { AuditLogEntry, DiffChange, Plugin, Role } from '../../types/dbt';
import type {
  FileContent,
  IWorkspacePort,
  WorkspaceFileEntry,
  WorkspaceGraphSnapshot,
} from '../../ports/workspace';
import { ApiError, type ApiClient } from '../api/createApiClient';
import {
  detectWorkspaceServiceLocale,
  resolveWorkspaceServiceCopy,
} from './workspaceServiceCopy';
import { WorkspaceFileLoadError, WORKSPACE_HTTP_ERROR_REASON } from './workspaceErrors';
import { isWorkspaceHttpErrorEnvelope } from './workspaceGraphDraftHttp';

function isWorkspaceFileNotFoundApiError(error: ApiError): boolean {
  if (!isWorkspaceHttpErrorEnvelope(error.responseBody)) {
    return false;
  }

  return (
    error.responseBody.error.type === 'not_found' &&
    error.responseBody.error.reason === WORKSPACE_HTTP_ERROR_REASON.fileNotFound
  );
}

export function createApiWorkspaceService(apiClient: ApiClient): IWorkspacePort {
  return {
    getGraphSnapshot: () => apiClient.getJson<WorkspaceGraphSnapshot>('/workspace/graph'),
    getDiffChanges: () => apiClient.getJson<DiffChange[]>('/diff/changes'),
    getPlugins: () => apiClient.getJson<Plugin[]>('/plugins'),
    getRoles: () => apiClient.getJson<Role[]>('/admin/roles'),
    getAuditLog: () => apiClient.getJson<AuditLogEntry[]>('/admin/audit'),
    listWarehouseConnections: async () => {
      throw new Error(
        resolveWorkspaceServiceCopy(detectWorkspaceServiceLocale()).warehouseImportApiModeUnavailable
      );
    },
    listWarehouseTables: async () => {
      throw new Error(
        resolveWorkspaceServiceCopy(detectWorkspaceServiceLocale()).warehouseImportApiModeUnavailable
      );
    },
    importSources: async () => {
      throw new Error(
        resolveWorkspaceServiceCopy(detectWorkspaceServiceLocale()).warehouseImportApiModeUnavailable
      );
    },
    listFiles: () => apiClient.getJson<WorkspaceFileEntry[]>('/workspace/files'),
    getFileContent: async (path) => {
      try {
        return await apiClient.getJson<FileContent>(`/workspace/files/${encodeURIComponent(path)}`);
      } catch (error) {
        if (error instanceof ApiError && isWorkspaceFileNotFoundApiError(error)) {
          throw new WorkspaceFileLoadError('not_found', path);
        }

        throw error;
      }
    },
    saveFileContent: (path, content) =>
      apiClient.postJson<{ content: string }, FileContent>(
        `/workspace/files/${encodeURIComponent(path)}`,
        { content }
      ),
  };
}
