/** Owned concern: adapt workspace capability ports to protected API rails. */
import {
  ImportSourceObjectsResultV2Schema,
  SourceObjectCatalogResponseSchema,
  TestWarehouseConnectionResultSchema,
  WarehouseConnectionListSchema,
  WarehouseConnectionSchema,
  parseWorkspaceGraphDraftReadResponse,
} from '@dvt/contracts';

import type {
  FileContent,
  IWarehouseSourceImportPort,
  IWorkspaceAdminReadPort,
  IWorkspaceDiffQueryPort,
  IWorkspaceFileContentCommandPort,
  IWorkspaceFileHistoryQueryPort,
  IWorkspaceFilesQueryPort,
  IWorkspaceGraphSnapshotQueryPort,
  SaveWorkspaceFileContentInput,
  WorkspaceFileEntry,
  WorkspaceFileSaveReceipt,
  WorkspaceGraphSnapshot,
} from '../../ports/workspace';
import type { DiffChange } from '../../types/dbt';
import { ApiError, type ApiClient } from '../api/createApiClient';
import {
  WorkspaceApiCapabilityUnsupportedError,
  WorkspaceFileLoadError,
  WorkspaceFileRevisionConflictError,
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
import { buildWorkspaceFileHistoryEndpoint } from './workspaceFileHistoryHttp';
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
  sourceImportAvailable: true,
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

function isWorkspaceFileRevisionConflictApiError(error: ApiError): boolean {
  return (
    isWorkspaceHttpErrorEnvelope(error.responseBody) &&
    error.responseBody.error.type === 'conflict' &&
    error.responseBody.error.reason === WORKSPACE_FILES_HTTP_ERROR_REASON.revisionConflict
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

export function createApiWorkspaceFileHistoryQueryPort(
  apiClient: ApiClient
): IWorkspaceFileHistoryQueryPort {
  return {
    getFileHistory: (path) =>
      apiClient.getJson(buildWorkspaceFileHistoryEndpoint(path, readWorkspaceFilesScope())),
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

function buildWarehouseConnectionsEndpoint(): string {
  const scope = readWorkspaceGraphDraftScope();
  return `/workspace/warehouse/connections?tenantId=${encodeURIComponent(
    scope.tenantId
  )}&projectId=${encodeURIComponent(scope.projectId)}&environmentId=${encodeURIComponent(
    scope.environmentId
  )}`;
}

function buildWarehouseConnectionSourceObjectsEndpoint(connectionId: string): string {
  const scope = readWorkspaceGraphDraftScope();
  return `/workspace/warehouse/connections/${encodeURIComponent(
    connectionId
  )}/objects?tenantId=${encodeURIComponent(scope.tenantId)}&projectId=${encodeURIComponent(
    scope.projectId
  )}&environmentId=${encodeURIComponent(scope.environmentId)}`;
}

function buildWarehouseConnectionTestEndpoint(connectionId: string): string {
  const scope = readWorkspaceGraphDraftScope();
  return `/workspace/warehouse/connections/${encodeURIComponent(
    connectionId
  )}/test?tenantId=${encodeURIComponent(scope.tenantId)}&projectId=${encodeURIComponent(
    scope.projectId
  )}&environmentId=${encodeURIComponent(scope.environmentId)}`;
}

function buildWarehouseSourcesImportEndpoint(): string {
  const scope = readWorkspaceGraphDraftScope();
  return `/workspace/sources/import?tenantId=${encodeURIComponent(
    scope.tenantId
  )}&projectId=${encodeURIComponent(scope.projectId)}&environmentId=${encodeURIComponent(
    scope.environmentId
  )}`;
}

export function createApiWarehouseSourceImportPort(
  apiClient: ApiClient
): IWarehouseSourceImportPort {
  return {
    listWarehouseConnections: async () =>
      WarehouseConnectionListSchema.parse(
        await apiClient.getJson(buildWarehouseConnectionsEndpoint())
      ),
    listSourceObjects: async (connectionId) =>
      SourceObjectCatalogResponseSchema.parse(
        await apiClient.getJson(buildWarehouseConnectionSourceObjectsEndpoint(connectionId))
      ).objects,
    createWarehouseConnection: async (input) =>
      WarehouseConnectionSchema.parse(
        await apiClient.postJson(buildWarehouseConnectionsEndpoint(), input)
      ),
    testWarehouseConnection: async (connectionId) =>
      TestWarehouseConnectionResultSchema.parse(
        await apiClient.postJson(buildWarehouseConnectionTestEndpoint(connectionId), {})
      ),
    importSources: async (input) =>
      ImportSourceObjectsResultV2Schema.parse(
        await apiClient.postJson(buildWarehouseSourcesImportEndpoint(), input)
      ),
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

export function createApiWorkspaceFileContentCommandPort(
  apiClient: ApiClient
): IWorkspaceFileContentCommandPort {
  return {
    saveFileContent: async (input) => {
      const { path, ...request } = input;
      try {
        return await apiClient.postJson<
          Omit<SaveWorkspaceFileContentInput, 'path'>,
          WorkspaceFileSaveReceipt
        >(buildWorkspaceFileContentEndpoint(path, readWorkspaceFilesScope()), request);
      } catch (error) {
        if (error instanceof ApiError && isWorkspaceFileRevisionConflictApiError(error)) {
          throw new WorkspaceFileRevisionConflictError(path);
        }
        throw error;
      }
    },
  };
}
