import type { AuditLogEntry, DiffChange, Plugin, Role } from '../../types/dbt';
import type { FileContent, WorkspaceFileEntry } from '../../ports/workspace';
import type { ApiClient } from '../api/createApiClient';
import type { WorkspaceGraphSnapshot, WorkspaceService } from './workspaceService';

const unsupportedImportMessage =
  'Warehouse source import is not available in API mode until the backend endpoint is implemented.';

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
    getFileContent: (path) =>
      apiClient.getJson<FileContent>(`/workspace/files/${encodeURIComponent(path)}`),
    saveFileContent: (path, content) =>
      apiClient.postJson<{ content: string }, FileContent>(
        `/workspace/files/${encodeURIComponent(path)}`,
        { content }
      ),
  };
}
