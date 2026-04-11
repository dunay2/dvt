import type { AuditLogEntry, DiffChange, Plugin, Role } from '../../types/dbt';
import type { FileContent, WorkspaceFileEntry } from '../../ports/workspace';
import { ApiError, type ApiClient } from '../api/createApiClient';
import type { WorkspaceGraphSnapshot, WorkspaceService } from './workspaceService';
import { WorkspaceFileLoadError, WORKSPACE_HTTP_ERROR_REASON } from './workspaceErrors';

const unsupportedImportMessage =
  'Warehouse source import is not available in API mode until the backend endpoint is implemented.';

function isWorkspaceHttpErrorEnvelope(
  value: unknown
): value is { error: { type: string; reason: string } } {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as { error?: unknown };
  if (!candidate.error || typeof candidate.error !== 'object') {
    return false;
  }

  const errorRecord = candidate.error as { type?: unknown; reason?: unknown };
  return typeof errorRecord.type === 'string' && typeof errorRecord.reason === 'string';
}

function isWorkspaceFileNotFoundApiError(error: ApiError): boolean {
  if (!isWorkspaceHttpErrorEnvelope(error.responseBody)) {
    return false;
  }

  return (
    error.responseBody.error.type === 'not_found' &&
    error.responseBody.error.reason === WORKSPACE_HTTP_ERROR_REASON.fileNotFound
  );
}

export function createApiWorkspaceService(apiClient: ApiClient): WorkspaceService {
  return {
    getGraphSnapshot: () => apiClient.getJson<WorkspaceGraphSnapshot>('/workspace/graph'),
    getDiffChanges: () => apiClient.getJson<DiffChange[]>('/diff/changes'),
    getPlugins: () => apiClient.getJson<Plugin[]>('/plugins'),
    getRoles: () => apiClient.getJson<Role[]>('/admin/roles'),
    getAuditLog: () => apiClient.getJson<AuditLogEntry[]>('/admin/audit'),
    listWarehouseConnections: async () => {
      throw new Error(unsupportedImportMessage);
    },
    listWarehouseTables: async () => {
      throw new Error(unsupportedImportMessage);
    },
    importSources: async () => {
      throw new Error(unsupportedImportMessage);
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
