/** Owned concern: adapt the workspace graph draft authoring port to the protected HTTP API. */
import {
  parseWorkspaceGraphDraftReadResponse,
  parseWorkspaceGraphDraftSaveResponse,
  WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
  WORKSPACE_GRAPH_DRAFT_INITIAL_REVISION,
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
  parseJsonResponse,
  readWorkspaceGraphDraftScope,
  WORKSPACE_GRAPH_DRAFT_ENDPOINT,
} from './workspaceGraphDraftHttp';

function isProtectedDraftReadResponseStatus(statusCode: number): boolean {
  return statusCode === 200 || statusCode === 403 || statusCode === 404 || statusCode === 422;
}

function isProtectedDraftSaveResponseStatus(statusCode: number): boolean {
  return statusCode === 200 || statusCode === 403 || statusCode === 409 || statusCode === 422;
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
