import type { RequestedScope } from '../../domain/auth/types.js';

import {
  LIST_RUNS_ACTION,
  LIST_RUNS_LIMIT,
  LIST_RUNS_PARSE_ERROR_CODE,
  LIST_RUNS_PARSE_ERROR_RESPONSE,
  type ListRunsParseErrorCode,
} from './listRunsRouteParser.constants.js';
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

type ParsedListRunsResult =
  | { readonly ok: true; readonly value: ParsedListRunsRequest }
  | {
      readonly ok: false;
      readonly status: 400 | 403;
      readonly body: {
        readonly error:
          | typeof LIST_RUNS_PARSE_ERROR_RESPONSE.BAD_REQUEST
          | typeof LIST_RUNS_PARSE_ERROR_RESPONSE.FORBIDDEN;
        readonly code: ListRunsParseErrorCode;
      };
    };

type ListRunsBadRequestErrorCode =
  | typeof LIST_RUNS_PARSE_ERROR_CODE.INVALID_TENANT_ID
  | typeof LIST_RUNS_PARSE_ERROR_CODE.INVALID_PROJECT_ID
  | typeof LIST_RUNS_PARSE_ERROR_CODE.INVALID_ENVIRONMENT_ID
  | typeof LIST_RUNS_PARSE_ERROR_CODE.UNSUPPORTED_CURSOR
  | typeof LIST_RUNS_PARSE_ERROR_CODE.INVALID_LIMIT
  | typeof LIST_RUNS_PARSE_ERROR_CODE.LIMIT_OUT_OF_RANGE;

type ListRunsForbiddenErrorCode = typeof LIST_RUNS_PARSE_ERROR_CODE.MISSING_TENANT_SCOPE;

export function parseListRunsRequest(input: {
  readonly tenantId: string | undefined;
  readonly projectId: string | undefined;
  readonly environmentId: string | undefined;
  readonly limit: string | undefined;
  readonly cursor: string | undefined;
}): ParsedListRunsResult {
  const tenant = parseRequiredTenantId(input.tenantId);
  if (tenant.kind === 'missing') {
    return forbidden(LIST_RUNS_PARSE_ERROR_CODE.MISSING_TENANT_SCOPE);
  }
  if (tenant.kind === 'invalid') {
    return badRequest(LIST_RUNS_PARSE_ERROR_CODE.INVALID_TENANT_ID);
  }

  const project = parseOptionalProjectId(input.projectId);
  if (project.kind === 'invalid') {
    return badRequest(LIST_RUNS_PARSE_ERROR_CODE.INVALID_PROJECT_ID);
  }

  const environment = parseOptionalEnvironmentId(input.environmentId);
  if (environment.kind === 'invalid') {
    return badRequest(LIST_RUNS_PARSE_ERROR_CODE.INVALID_ENVIRONMENT_ID);
  }

  if (input.cursor !== undefined) {
    return badRequest(LIST_RUNS_PARSE_ERROR_CODE.UNSUPPORTED_CURSOR);
  }

  const limit = parseIntWithDefault(input.limit, LIST_RUNS_LIMIT.DEFAULT);
  if (limit === null) {
    return badRequest(LIST_RUNS_PARSE_ERROR_CODE.INVALID_LIMIT);
  }
  if (limit <= 0 || limit > LIST_RUNS_LIMIT.MAX) {
    return badRequest(LIST_RUNS_PARSE_ERROR_CODE.LIMIT_OUT_OF_RANGE);
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

function badRequest(code: ListRunsBadRequestErrorCode): ParsedListRunsResult {
  return {
    ok: false,
    status: 400,
    body: { error: LIST_RUNS_PARSE_ERROR_RESPONSE.BAD_REQUEST, code },
  };
}

function forbidden(code: ListRunsForbiddenErrorCode): ParsedListRunsResult {
  return {
    ok: false,
    status: 403,
    body: { error: LIST_RUNS_PARSE_ERROR_RESPONSE.FORBIDDEN, code },
  };
}
