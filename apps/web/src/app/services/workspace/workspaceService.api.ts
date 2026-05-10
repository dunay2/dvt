/** Owned concern: adapt the workspace service port to protected API read-model projections. */
import { parseWorkspaceGraphDraftReadResponse } from '@dvt/contracts';

import type {
  FileContent,
  IWorkspacePort,
  WorkspaceFileEntry,
  WorkspaceGraphSnapshot,
} from '../../ports/workspace';
import { ApiError, type ApiClient } from '../api/createApiClient';
import { detectWorkspaceServiceLocale, resolveWorkspaceServiceCopy } from './workspaceServiceCopy';
import {
  WorkspaceApiCapabilityUnsupportedError,
  WorkspaceFileLoadError,
  type WorkspaceApiUnsupportedCapability,
  type WorkspaceApiUnsupportedRail,
} from './workspaceErrors';
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

export const apiWorkspaceServiceCapabilities = {
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

export function createApiWorkspaceService(apiClient: ApiClient): IWorkspacePort {
  return {
    getGraphSnapshot: () => getWorkspaceGraphSnapshot(apiClient),
    getDiffChanges: () =>
      rejectUnsupportedApiWorkspaceCapability('workspace.diffChanges', 'GetWorkspaceDiffChanges'),
    getPlugins: () =>
      rejectUnsupportedApiWorkspaceCapability('workspace.plugins', 'ListWorkspacePlugins'),
    getRoles: () =>
      rejectUnsupportedApiWorkspaceCapability('workspace.adminRoles', 'ListAdminRoles'),
    getAuditLog: () =>
      rejectUnsupportedApiWorkspaceCapability('workspace.adminAuditLog', 'ListAdminAuditLog'),
    listWarehouseConnections: async () => {
      throw new Error(
        resolveWorkspaceServiceCopy(detectWorkspaceServiceLocale())
          .warehouseImportApiModeUnavailable
      );
    },
    listWarehouseTables: async () => {
      throw new Error(
        resolveWorkspaceServiceCopy(detectWorkspaceServiceLocale())
          .warehouseImportApiModeUnavailable
      );
    },
    importSources: async () => {
      throw new Error(
        resolveWorkspaceServiceCopy(detectWorkspaceServiceLocale())
          .warehouseImportApiModeUnavailable
      );
    },
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
    saveFileContent: () =>
      rejectUnsupportedApiWorkspaceCapability('workspace.fileWrite', 'SaveWorkspaceFileContent'),
  };
}
