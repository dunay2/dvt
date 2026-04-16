import type { AuditLogEntry, DiffChange, Plugin, Role } from '../../types/dbt';
import type {
  FileContent,
  SaveWorkspaceGraphDraftInput,
  SaveWorkspaceGraphDraftResult,
  WorkspaceFileEntry,
  WorkspaceGraphDraftRecord,
} from '../../ports/workspace';
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

function isGraphDraftConflictResponse(
  value: unknown
): value is { error: { type: string; reason: string }; current: WorkspaceGraphDraftRecord } {
  if (!isWorkspaceHttpErrorEnvelope(value)) {
    return false;
  }

  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = (value as { current?: unknown }).current;
  if (!record || typeof record !== 'object') {
    return false;
  }

  const candidate = record as { revision?: unknown; savedAt?: unknown; draft?: unknown };
  return (
    typeof candidate.revision === 'string' &&
    typeof candidate.savedAt === 'string' &&
    candidate.draft != null &&
    typeof candidate.draft === 'object'
  );
}

export function createApiWorkspaceService(apiClient: ApiClient): WorkspaceService {
  async function parseJsonResponse<T>(response: Response): Promise<T> {
    return (await response.json()) as T;
  }

  async function getGraphDraft(): Promise<WorkspaceGraphDraftRecord | null> {
    try {
      return await apiClient.getJson<WorkspaceGraphDraftRecord>('/workspace/graph/draft');
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  async function saveGraphDraft(
    input: SaveWorkspaceGraphDraftInput
  ): Promise<SaveWorkspaceGraphDraftResult> {
    const response = await apiClient.requestRaw('/workspace/graph/draft', {
      method: 'PUT',
      jsonBody: input,
    });

    if (response.ok) {
      const body = await parseJsonResponse<{ record: WorkspaceGraphDraftRecord }>(response);
      return { outcome: 'saved', record: body.record };
    }

    const responseBody = await response.json().catch(() => null);

    if (
      response.status === 409 &&
      isGraphDraftConflictResponse(responseBody) &&
      responseBody.error.reason === WORKSPACE_HTTP_ERROR_REASON.graphDraftConflict
    ) {
      return { outcome: 'conflict', current: responseBody.current };
    }

    throw new ApiError({
      message: `Request to /workspace/graph/draft failed (${response.status})`,
      endpoint: '/workspace/graph/draft',
      statusCode: response.status,
      category: response.status >= 500 ? 'server' : 'client',
      responseBody,
    });
  }

  return {
    getGraphSnapshot: () => apiClient.getJson<WorkspaceGraphSnapshot>('/workspace/graph'),
    getGraphDraft,
    saveGraphDraft,
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
