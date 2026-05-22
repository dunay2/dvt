/** Owned concern: adapt workspace capability ports to protected API rails. */
import { parseWorkspaceGraphDraftReadResponse } from '@dvt/contracts';

import type {
  FileContent,
  IWarehouseSourceImportPort,
  IWorkspaceAdminReadPort,
  IWorkspaceDiffQueryPort,
  IWorkspaceFileContentCommandPort,
  IWorkspaceFilesQueryPort,
  IWorkspaceGraphSnapshotQueryPort,
  IWorkspacePluginCatalogQueryPort,
  WorkspaceFileEntry,
  WorkspaceGraphSnapshot,
} from '../../ports/workspace';
import type { DiffChange } from '../../types/dbt';
import { ApiError, type ApiClient } from '../api/createApiClient';
import { detectWorkspacePortLocale, resolveWorkspacePortCopy } from './workspacePortCopy';
import {
  WorkspaceApiCapabilityUnsupportedError,
  WorkspaceFileLoadError,
  type WorkspaceApiUnsupportedCapability,
  type WorkspaceApiUnsupportedRail,
} from './workspaceErrors';
import {
  buildWorkspaceDiffChangesEndpoint,
  readWorkspaceDiffChangesScope,
} from './workspaceDiffChangesHttp';
import {
  buildWorkspaceFileContentEndpoint,
  buildWorkspaceFilesEndpoint,
  readWorkspaceFilesScope,
  WORKSPACE_FILES_HTTP_ERROR_REASON,
} from './workspaceFilesHttp';
import {
  buildWorkspaceGraphDraftEndpoint,
  createRequestFailedApiError,
  isWorkspaceGraphDraftNotFoundResponse,
  isWorkspaceHttpErrorEnvelope,
  parseJsonResponse,
  readWorkspaceGraphDraftScope,
} from './workspaceGraphDraftHttp';
import { projectWorkspaceGraphDraftReadResponseSnapshot } from './workspaceGraphDraftSnapshotProjection';

export const apiWorkspacePortCapabilities = {
  sourceImportAvailable: false,
} as const;

function isWorkspaceFileNotFoundApiError(error: ApiError): boolean {
  if (!isWorkspaceHttpErrorEnvelope(error.responseBody)) {
    return false;
  }

  return (
    error.responseBody.error.type === 'not_found' &&
    error.responseBody.error.reason === WORKSPACE_FILES_HTTP_ERROR_REASON.fileNotFound
  );
}

async function getWorkspaceGraphSnapshot(apiClient: ApiClient): Promise<WorkspaceGraphSnapshot> {
  const endpoint = buildWorkspaceGraphDraftEndpoint(readWorkspaceGraphDraftScope());
  const response = await apiClient.requestRaw(endpoint, {
    method: 'GET',
  });
  const responseBody = await parseJsonResponse(response);

  if (isWorkspaceGraphDraftNotFoundResponse({ statusCode: response.status, responseBody })) {
    return { nodes: [], edges: [] };
  }

  if (response.status !== 200) {
    throw createRequestFailedApiError(endpoint, response.status, responseBody);
  }

  return projectWorkspaceGraphDraftReadResponseSnapshot(
    parseWorkspaceGraphDraftReadResponse(responseBody)
  );
}

function rejectUnsupportedApiWorkspaceCapability(
  capability: WorkspaceApiUnsupportedCapability,
  rail: WorkspaceApiUnsupportedRail
): Promise<never> {
  return Promise.reject(new WorkspaceApiCapabilityUnsupportedError(capability, rail));
}

export function createApiWorkspaceGraphSnapshotQueryPort(
  apiClient: ApiClient
): IWorkspaceGraphSnapshotQueryPort {
  return {
    getGraphSnapshot: () => getWorkspaceGraphSnapshot(apiClient),
  };
}

export function createApiWorkspaceDiffQueryPort(apiClient: ApiClient): IWorkspaceDiffQueryPort {
  return {
    getDiffChanges: () =>
      apiClient.getJson<DiffChange[]>(
        buildWorkspaceDiffChangesEndpoint(readWorkspaceDiffChangesScope())
      ),
  };
}

export function createApiWorkspacePluginCatalogQueryPort(): IWorkspacePluginCatalogQueryPort {
  return {
    getPlugins: () =>
      rejectUnsupportedApiWorkspaceCapability('workspace.plugins', 'ListWorkspacePlugins'),
  };
}

export function createApiWorkspaceAdminReadPort(): IWorkspaceAdminReadPort {
  return {
    getRoles: () =>
      rejectUnsupportedApiWorkspaceCapability('workspace.adminRoles', 'ListAdminRoles'),
    getAuditLog: () =>
      rejectUnsupportedApiWorkspaceCapability('workspace.adminAuditLog', 'ListAdminAuditLog'),
  };
}

export function createApiWarehouseSourceImportPort(): IWarehouseSourceImportPort {
  return {
    listWarehouseConnections: async () => {
      throw new Error(
        resolveWorkspacePortCopy(detectWorkspacePortLocale()).warehouseImportApiModeUnavailable
      );
    },
    listWarehouseTables: async () => {
      throw new Error(
        resolveWorkspacePortCopy(detectWorkspacePortLocale()).warehouseImportApiModeUnavailable
      );
    },
    importSources: async () => {
      throw new Error(
        resolveWorkspacePortCopy(detectWorkspacePortLocale()).warehouseImportApiModeUnavailable
      );
    },
  };
}

export function createApiWorkspaceFilesQueryPort(apiClient: ApiClient): IWorkspaceFilesQueryPort {
  return {
    listFiles: () =>
      apiClient.getJson<WorkspaceFileEntry[]>(
        buildWorkspaceFilesEndpoint(readWorkspaceFilesScope())
      ),
    getFileContent: async (path) => {
      try {
        return await apiClient.getJson<FileContent>(
          buildWorkspaceFileContentEndpoint(path, readWorkspaceFilesScope())
        );
      } catch (error) {
        if (error instanceof ApiError && isWorkspaceFileNotFoundApiError(error)) {
          throw new WorkspaceFileLoadError('not_found', path);
        }

        throw error;
      }
    },
  };
}

export function createApiWorkspaceFileContentCommandPort(): IWorkspaceFileContentCommandPort {
  return {
    saveFileContent: () =>
      rejectUnsupportedApiWorkspaceCapability('workspace.fileWrite', 'SaveWorkspaceFileContent'),
  };
}
