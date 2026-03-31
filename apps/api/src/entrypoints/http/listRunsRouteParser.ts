import type { RequestedScope } from '../../domain/auth/types.js';

import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { LIST_RUNS_ACTION, LIST_RUNS_LIMIT } from './listRunsRouteParser.constants.js';
import { badRequestResult, forbiddenResult, type RouteParseResult } from './routeParseIssue.js';
import {
  parseIntWithDefault,
  parseOptionalEnvironmentId,
  parseOptionalProjectId,
  parseRequiredTenantId,
} from './routeParserPrimitives.js';

export interface ParsedListRunsRequest {
  readonly requestedScope: RequestedScope & {
    readonly action: typeof LIST_RUNS_ACTION;
  };
  readonly query: {
    readonly limit: number;
  };
}

type ParsedListRunsResult = RouteParseResult<ParsedListRunsRequest>;

export function parseListRunsRequest(input: {
  readonly tenantId: string | undefined;
  readonly projectId: string | undefined;
  readonly environmentId: string | undefined;
  readonly limit: string | undefined;
  readonly cursor: string | undefined;
}): ParsedListRunsResult {
  const tenant = parseRequiredTenantId(input.tenantId);
  if (tenant.kind === 'missing') {
    return forbiddenResult(HTTP_ERROR_REASON.missingTenantScope, { target: 'tenantId' });
  }
  if (tenant.kind === 'invalid') {
    return badRequestResult(HTTP_ERROR_REASON.invalidTenantId, { target: 'tenantId' });
  }

  const project = parseOptionalProjectId(input.projectId);
  if (project.kind === 'invalid') {
    return badRequestResult(HTTP_ERROR_REASON.invalidProjectId, { target: 'projectId' });
  }

  const environment = parseOptionalEnvironmentId(input.environmentId);
  if (environment.kind === 'invalid') {
    return badRequestResult(HTTP_ERROR_REASON.invalidEnvironmentId, { target: 'environmentId' });
  }

  if (input.cursor !== undefined) {
    return badRequestResult(HTTP_ERROR_REASON.unsupportedCursor, { target: 'cursor' });
  }

  const limit = parseIntWithDefault(input.limit, LIST_RUNS_LIMIT.DEFAULT);
  if (limit === null) {
    return badRequestResult(HTTP_ERROR_REASON.invalidLimit, { target: 'limit' });
  }
  if (limit <= 0 || limit > LIST_RUNS_LIMIT.MAX) {
    return badRequestResult(HTTP_ERROR_REASON.limitOutOfRange, { target: 'limit' });
  }

  return {
    ok: true,
    value: {
      requestedScope: {
        tenantId: tenant.value,
        ...(project.value ? { projectId: project.value } : {}),
        ...(environment.value ? { environmentId: environment.value } : {}),
        action: LIST_RUNS_ACTION,
      },
      query: { limit },
    },
  };
}
