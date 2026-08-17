/** Owned concern: adapt workspace capability ports to protected API rails. */
import {
  ImportSourceObjectsResultV2Schema,
  SourceObjectCatalogResponseSchema,
  SourceDataSampleResponseSchema,
  TestWarehouseConnectionResultSchema,
  WarehouseConnectionListSchema,
  WarehouseConnectionSchema,
  parseWorkspaceGraphDraftReadResponse,
} from '@dvt/contracts';

import type {
  FileContent,
  IWarehouseSourceImportPort,
  IWarehouseSourceDataSampleQueryPort,
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
import type { FrontendOperabilitySink } from '../../ports/frontendOperability';
import type { DiffChange } from '../../types/dbt';
import { ApiError, type ApiClient } from '../api/createApiClient';
import {
  createContractFailureEvent,
  recordFrontendOperabilityEvent,
} from '../operability/frontendOperabilityRecorder';
import {
  WorkspaceApiCapabilityUnsupportedError,
  WarehouseSourceDataSampleQueryError,
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
  isWorkspaceHttpErrorEnvelope,
  parseJsonResponse,
  readWorkspaceGraphDraftScope,
} from './workspaceGraphDraftHttp';
import { projectWorkspaceGraphDraftReadResponseSnapshot } from './workspaceGraphDraftSnapshotProjection';

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

  if (response.status !== 200 && response.status !== 404) {
    throw createRequestFailedApiError(endpoint, response.status, responseBody);
  }

  const draftResponse = parseWorkspaceGraphDraftReadResponse(responseBody);
  if (draftResponse.kind === 'not_found') {
    return {
      nodes: [],
      edges: [],
      authoringAuthority: {
        kind: 'unresolved',
        reason: 'missing_authority',
        canvasId: null,
      },
    };
  }

  return projectWorkspaceGraphDraftReadResponseSnapshot(draftResponse);
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

function buildWarehouseConnectionSourceDataSampleEndpoint(
  connectionId: string,
  objectId: string,
  limit: number
): string {
  const scope = readWorkspaceGraphDraftScope();
  return `/workspace/warehouse/connections/${encodeURIComponent(
    connectionId
  )}/source-data-sample?tenantId=${encodeURIComponent(
    scope.tenantId
  )}&projectId=${encodeURIComponent(scope.projectId)}&environmentId=${encodeURIComponent(
    scope.environmentId
  )}&objectId=${encodeURIComponent(objectId)}&limit=${limit}`;
}

function buildWarehouseConnectionEndpoint(connectionId: string): string {
  const scope = readWorkspaceGraphDraftScope();
  return `/workspace/warehouse/connections/${encodeURIComponent(
    connectionId
  )}?tenantId=${encodeURIComponent(scope.tenantId)}&projectId=${encodeURIComponent(
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
  apiClient: ApiClient,
  frontendOperabilitySink: FrontendOperabilitySink
): IWarehouseSourceImportPort {
  return {
    listWarehouseConnections: async () =>
      WarehouseConnectionListSchema.parse(
        await apiClient.getJson(buildWarehouseConnectionsEndpoint())
      ),
    listSourceObjects: async (connectionId) => {
      const response = await apiClient.getJson(
        buildWarehouseConnectionSourceObjectsEndpoint(connectionId)
      );
      const parsed = SourceObjectCatalogResponseSchema.safeParse(response);
      if (!parsed.success) {
        recordFrontendOperabilityEvent(
          frontendOperabilitySink,
          createContractFailureEvent(
            'ListWarehouseConnectionSourceObjects',
            'response-contract-rejected'
          )
        );
        throw parsed.error;
      }

      return parsed.data.objects;
    },
    createWarehouseConnection: async (input) =>
      WarehouseConnectionSchema.parse(
        await apiClient.postJson(buildWarehouseConnectionsEndpoint(), input)
      ),
    renameWarehouseConnection: async (connectionId, input) => {
      const endpoint = buildWarehouseConnectionEndpoint(connectionId);
      const response = await apiClient.requestRaw(endpoint, { method: 'PATCH', jsonBody: input });
      const responseBody = await parseJsonResponse(response);
      if (!response.ok) {
        throw createRequestFailedApiError(endpoint, response.status, responseBody);
      }
      return WarehouseConnectionSchema.parse(responseBody);
    },
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

export function createApiWarehouseSourceDataSampleQueryPort(
  apiClient: ApiClient,
  frontendOperabilitySink: FrontendOperabilitySink
): IWarehouseSourceDataSampleQueryPort {
  return {
    previewSourceObjectRows: async (input) => {
      const endpoint = buildWarehouseConnectionSourceDataSampleEndpoint(
        input.connectionId,
        input.objectId,
        input.limit
      );
      try {
        const response = await apiClient.getJson(endpoint);
        const parsed = SourceDataSampleResponseSchema.safeParse(response);
        if (!parsed.success) {
          recordFrontendOperabilityEvent(
            frontendOperabilitySink,
            createContractFailureEvent(
              'PreviewWarehouseSourceObjectRows',
              'response-contract-rejected'
            )
          );
          throw parsed.error;
        }
        return parsed.data;
      } catch (error) {
        if (error instanceof ApiError && isWorkspaceHttpErrorEnvelope(error.responseBody)) {
          switch (error.responseBody.error.reason) {
            case 'warehouse_connection_not_found':
              throw new WarehouseSourceDataSampleQueryError('connection_not_found');
            case 'source_object_not_found':
              throw new WarehouseSourceDataSampleQueryError('source_object_not_found');
            case 'warehouse_source_data_sample_failed':
              throw new WarehouseSourceDataSampleQueryError('unavailable');
          }
        }
        throw error;
      }
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
