/** Owned concern: adapt the workspace graph draft authoring port to the protected HTTP API. */
import {
  parseWorkspaceGraphDraftReadResponse,
  parseWorkspaceGraphDraftSaveResponse,
} from '@dvt/contracts';

import type {
  IWorkspaceGraphDraftAuthoringPort,
  SaveWorkspaceGraphDraftAuthoringInput,
  WorkspaceGraphDraftAuthoringReadResult,
  WorkspaceGraphDraftAuthoringSaveResult,
} from '../../ports/workspaceGraphDraftAuthoring';
import type { ApiClient } from '../api/createApiClient';
import {
  buildWorkspaceGraphDraftEndpoint,
  createRequestFailedApiError,
  isWorkspaceGraphDraftNotFoundResponse,
  matchWorkspaceGraphDraftHttpError,
  parseJsonResponse,
  readWorkspaceGraphDraftScope,
  WORKSPACE_GRAPH_DRAFT_ENDPOINT,
  WORKSPACE_GRAPH_DRAFT_HTTP_ERROR_REASON,
} from './workspaceGraphDraftHttp';
import {
  WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
  WORKSPACE_GRAPH_DRAFT_INITIAL_REVISION,
} from './workspaceGraphDraftProtocol';

function isProtectedDraftReadResponseStatus(statusCode: number): boolean {
  return statusCode === 200 || statusCode === 401 || statusCode === 403 || statusCode === 422;
}

function isProtectedDraftSaveResponseStatus(statusCode: number): boolean {
  return statusCode === 200 || statusCode === 401 || statusCode === 403 || statusCode === 409;
}

function readWorkspaceGraphDraftExpectedSchemaVersion(responseBody: {
  error: { details?: Record<string, unknown> };
}): string {
  const expectedSchemaVersion = responseBody.error.details?.expectedSchemaVersion;
  return typeof expectedSchemaVersion === 'string'
    ? expectedSchemaVersion
    : WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION;
}

function resolveUnsupportedSchemaVersionOutcome(
  statusCode: number,
  responseBody: unknown
): WorkspaceGraphDraftAuthoringSaveResult | null {
  const matchedError = matchWorkspaceGraphDraftHttpError({
    statusCode,
    responseBody,
    expectedStatusCode: 422,
    expectedReason: WORKSPACE_GRAPH_DRAFT_HTTP_ERROR_REASON.unsupportedSchemaVersion,
  });
  if (matchedError === null) {
    return null;
  }

  return {
    kind: 'unsupported_schema_version',
    expectedSchemaVersion: readWorkspaceGraphDraftExpectedSchemaVersion(matchedError),
  };
}

function resolveIdempotencyMismatchOutcome(
  statusCode: number,
  responseBody: unknown
): WorkspaceGraphDraftAuthoringSaveResult | null {
  const matchedError = matchWorkspaceGraphDraftHttpError({
    statusCode,
    responseBody,
    expectedStatusCode: 409,
    expectedReason: WORKSPACE_GRAPH_DRAFT_HTTP_ERROR_REASON.idempotencyKeyReused,
  });
  if (matchedError === null) {
    return null;
  }

  return {
    kind: 'idempotency_mismatch',
  };
}

function buildWorkspaceGraphDraftSaveRequestBody(input: SaveWorkspaceGraphDraftAuthoringInput) {
  return {
    scope: readWorkspaceGraphDraftScope(),
    schemaVersion: WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
    expectedRevision: input.expectedRevision ?? WORKSPACE_GRAPH_DRAFT_INITIAL_REVISION,
    idempotencyKey: input.idempotencyKey,
    draft: input.draft,
  };
}

export function createApiWorkspaceGraphDraftAuthoringPort(
  apiClient: ApiClient
): IWorkspaceGraphDraftAuthoringPort {
  return {
    async readGraphDraft(): Promise<WorkspaceGraphDraftAuthoringReadResult> {
      const endpoint = buildWorkspaceGraphDraftEndpoint(readWorkspaceGraphDraftScope());
      const response = await apiClient.requestRaw(endpoint, {
        method: 'GET',
      });
      const responseBody = await parseJsonResponse(response);

      if (isWorkspaceGraphDraftNotFoundResponse({ statusCode: response.status, responseBody })) {
        return { kind: 'not_found' };
      }

      if (!isProtectedDraftReadResponseStatus(response.status)) {
        throw createRequestFailedApiError(endpoint, response.status, responseBody);
      }

      return parseWorkspaceGraphDraftReadResponse(responseBody);
    },

    async saveGraphDraft(
      input: SaveWorkspaceGraphDraftAuthoringInput
    ): Promise<WorkspaceGraphDraftAuthoringSaveResult> {
      const response = await apiClient.requestRaw(WORKSPACE_GRAPH_DRAFT_ENDPOINT, {
        method: 'PUT',
        jsonBody: buildWorkspaceGraphDraftSaveRequestBody(input),
      });
      const responseBody = await parseJsonResponse(response);

      const unsupportedSchemaVersion = resolveUnsupportedSchemaVersionOutcome(
        response.status,
        responseBody
      );
      if (unsupportedSchemaVersion) {
        return unsupportedSchemaVersion;
      }

      const idempotencyMismatch = resolveIdempotencyMismatchOutcome(response.status, responseBody);
      if (idempotencyMismatch) {
        return idempotencyMismatch;
      }

      if (!isProtectedDraftSaveResponseStatus(response.status)) {
        throw createRequestFailedApiError(
          WORKSPACE_GRAPH_DRAFT_ENDPOINT,
          response.status,
          responseBody
        );
      }

      return parseWorkspaceGraphDraftSaveResponse(responseBody);
    },
  };
}
