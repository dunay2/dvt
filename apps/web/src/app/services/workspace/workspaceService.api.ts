import {
  parseWorkspaceGraphDraftReadResponse,
  parseWorkspaceGraphDraftSaveResponse,
} from '@dvt/contracts';

import type { AuditLogEntry, DiffChange, Plugin, Role } from '../../types/dbt';
import type {
  FileContent,
  IWorkspacePort,
  SaveWorkspaceGraphDraftInput,
  SaveWorkspaceGraphDraftResult,
  WorkspaceFileEntry,
  WorkspaceGraphSnapshot,
  WorkspaceGraphDraftRecord,
} from '../../ports/workspace';
import { ApiError, type ApiClient } from '../api/createApiClient';
import { projectProtectedWorkspaceGraphDraftRecord } from './workspaceGraphDraftProjection';
import {
  buildWorkspaceGraphDraftEndpoint,
  createRequestFailedApiError,
  isWorkspaceHttpErrorEnvelope,
  parseJsonResponse,
  readWorkspaceGraphDraftScope,
  WORKSPACE_GRAPH_DRAFT_ENDPOINT,
} from './workspaceGraphDraftHttp';
import {
  WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
  WORKSPACE_GRAPH_DRAFT_INITIAL_REVISION,
} from './workspaceGraphDraftProtocol';
import {
  detectWorkspaceServiceLocale,
  resolveWorkspaceServiceCopy,
} from './workspaceServiceCopy';
import { WorkspaceFileLoadError, WORKSPACE_HTTP_ERROR_REASON } from './workspaceErrors';

type WorkspaceGraphDraftScope = ReturnType<typeof readWorkspaceGraphDraftScope>;

function isWorkspaceFileNotFoundApiError(error: ApiError): boolean {
  if (!isWorkspaceHttpErrorEnvelope(error.responseBody)) {
    return false;
  }

  return (
    error.responseBody.error.type === 'not_found' &&
    error.responseBody.error.reason === WORKSPACE_HTTP_ERROR_REASON.fileNotFound
  );
}

async function requestWorkspaceGraphDraftRecord(
  apiClient: ApiClient,
  scope: WorkspaceGraphDraftScope
): Promise<{
  endpoint: string;
  response: Response;
  responseBody: unknown;
}> {
  const endpoint = buildWorkspaceGraphDraftEndpoint(scope);
  const response = await apiClient.requestRaw(endpoint, {
    method: 'GET',
  });
  const responseBody = await parseJsonResponse(response);

  return { endpoint, response, responseBody };
}

function resolveMissingWorkspaceGraphDraftRecord(args: {
  endpoint: string;
  response: Response;
  responseBody: unknown;
  requireRecord: boolean;
}): WorkspaceGraphDraftRecord | null | undefined {
  if (args.response.status !== 404) {
    return undefined;
  }

  if (args.requireRecord) {
    throw new ApiError({
      message: `Request to ${args.endpoint} returned no draft after draft write (${args.response.status})`,
      endpoint: args.endpoint,
      statusCode: args.response.status,
      category: 'client',
      responseBody: args.responseBody,
    });
  }

  return null;
}

function assertWorkspaceGraphDraftRequestSucceeded(args: {
  endpoint: string;
  response: Response;
  responseBody: unknown;
}): void {
  if (!args.response.ok) {
    throw createRequestFailedApiError(args.endpoint, args.response.status, args.responseBody);
  }
}

function parseWorkspaceGraphDraftReadSuccess(args: {
  endpoint: string;
  response: Response;
  responseBody: unknown;
}) {
  const parsedResponse = parseWorkspaceGraphDraftReadResponse(args.responseBody);
  if (parsedResponse.kind !== 'ok') {
    throw new ApiError({
      message: `Request to ${args.endpoint} returned unexpected draft-read outcome (${parsedResponse.kind})`,
      endpoint: args.endpoint,
      statusCode: args.response.status,
      category: 'client',
      responseBody: parsedResponse,
    });
  }

  return parsedResponse;
}

function isProtectedDraftSaveResponseStatus(statusCode: number): boolean {
  return statusCode === 200 || statusCode === 201 || statusCode === 202 || statusCode === 204
    ? true
    : statusCode === 403 || statusCode === 409;
}

function buildWorkspaceGraphDraftSaveRequestBody(
  scope: WorkspaceGraphDraftScope,
  input: SaveWorkspaceGraphDraftInput
) {
  return {
    scope,
    schemaVersion: WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
    expectedRevision: input.expectedRevision ?? WORKSPACE_GRAPH_DRAFT_INITIAL_REVISION,
    idempotencyKey: input.idempotencyKey,
    draft: input.draft,
  };
}

async function readWorkspaceGraphDraftRecord(
  apiClient: ApiClient,
  scope: WorkspaceGraphDraftScope,
  options?: { requireRecord?: boolean }
): Promise<WorkspaceGraphDraftRecord | null> {
  const draftResponse = await requestWorkspaceGraphDraftRecord(apiClient, scope);
  const missingRecord = resolveMissingWorkspaceGraphDraftRecord({
    ...draftResponse,
    requireRecord: options?.requireRecord ?? false,
  });

  if (missingRecord !== undefined) {
    return missingRecord;
  }

  assertWorkspaceGraphDraftRequestSucceeded(draftResponse);
  const parsedResponse = parseWorkspaceGraphDraftReadSuccess(draftResponse);

  return projectProtectedWorkspaceGraphDraftRecord(parsedResponse.record);
}

async function readRequiredWorkspaceGraphDraftRecord(
  apiClient: ApiClient,
  scope: WorkspaceGraphDraftScope
): Promise<WorkspaceGraphDraftRecord> {
  const record = await readWorkspaceGraphDraftRecord(apiClient, scope, { requireRecord: true });
  if (record == null) {
    throw new Error('Workspace graph draft record unexpectedly missing after required read.');
  }

  return record;
}

async function saveWorkspaceGraphDraft(
  apiClient: ApiClient,
  input: SaveWorkspaceGraphDraftInput
): Promise<SaveWorkspaceGraphDraftResult> {
  const scope = readWorkspaceGraphDraftScope();
  const response = await apiClient.requestRaw(WORKSPACE_GRAPH_DRAFT_ENDPOINT, {
    method: 'PUT',
    jsonBody: buildWorkspaceGraphDraftSaveRequestBody(scope, input),
  });
  const responseBody = await parseJsonResponse(response);

  if (!isProtectedDraftSaveResponseStatus(response.status)) {
    throw createRequestFailedApiError(
      WORKSPACE_GRAPH_DRAFT_ENDPOINT,
      response.status,
      responseBody
    );
  }

  const parsedResponse = parseWorkspaceGraphDraftSaveResponse(responseBody);
  if (parsedResponse.kind === 'saved') {
    return {
      outcome: 'saved',
      record: await readRequiredWorkspaceGraphDraftRecord(apiClient, scope),
    };
  }

  if (parsedResponse.kind === 'conflict') {
    return {
      outcome: 'conflict',
      current: await readRequiredWorkspaceGraphDraftRecord(apiClient, scope),
    };
  }

  throw createRequestFailedApiError(WORKSPACE_GRAPH_DRAFT_ENDPOINT, response.status, responseBody);
}

export function createApiWorkspaceService(apiClient: ApiClient): IWorkspacePort {
  async function getGraphDraft(): Promise<WorkspaceGraphDraftRecord | null> {
    return await readWorkspaceGraphDraftRecord(apiClient, readWorkspaceGraphDraftScope());
  }

  async function saveGraphDraft(
    input: SaveWorkspaceGraphDraftInput
  ): Promise<SaveWorkspaceGraphDraftResult> {
    return await saveWorkspaceGraphDraft(apiClient, input);
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
