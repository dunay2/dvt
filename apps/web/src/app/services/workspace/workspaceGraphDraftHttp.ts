import { ApiError } from '../api/createApiClient';
import { useSessionStore } from '../../stores/sessionStore';

export const WORKSPACE_GRAPH_DRAFT_ENDPOINT = '/workspace/graph/draft';

export const WORKSPACE_GRAPH_DRAFT_HTTP_ERROR_REASON = Object.freeze({
  notFound: 'workspace_graph_draft_not_found',
  unsupportedSchemaVersion: 'workspace_graph_draft_unsupported_schema_version',
  idempotencyKeyReused: 'workspace_graph_draft_idempotency_key_reused',
} as const);

export function isWorkspaceHttpErrorEnvelope(
  value: unknown
): value is { error: { type: string; reason: string; details?: Record<string, unknown> } } {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as { error?: unknown };
  if (!candidate.error || typeof candidate.error !== 'object') {
    return false;
  }

  const errorRecord = candidate.error as {
    type?: unknown;
    reason?: unknown;
    details?: unknown;
  };
  return typeof errorRecord.type === 'string' && typeof errorRecord.reason === 'string';
}

export function readWorkspaceGraphDraftScope(): {
  tenantId: string;
  projectId: string;
  environmentId: string;
} {
  const { tenantId, projectId, environmentId } = useSessionStore.getState();
  return { tenantId, projectId, environmentId };
}

export function buildWorkspaceGraphDraftEndpoint(scope: {
  tenantId: string;
  projectId: string;
  environmentId: string;
}): string {
  const query = new URLSearchParams(scope);
  return `${WORKSPACE_GRAPH_DRAFT_ENDPOINT}?${query.toString()}`;
}

export async function parseJsonResponse(response: Response): Promise<unknown> {
  return await response.json().catch(() => null);
}

function buildApiErrorCategory(statusCode: number): 'client' | 'server' {
  return statusCode >= 500 ? 'server' : 'client';
}

export function createRequestFailedApiError(
  endpoint: string,
  statusCode: number,
  responseBody: unknown
): ApiError {
  return new ApiError({
    message: `Request to ${endpoint} failed (${statusCode})`,
    endpoint,
    statusCode,
    category: buildApiErrorCategory(statusCode),
    responseBody,
  });
}
