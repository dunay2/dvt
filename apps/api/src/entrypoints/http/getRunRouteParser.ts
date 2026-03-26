import type { RequestedScope } from '../../domain/auth/types.js';

import {
  GET_RUN_ACTION,
  GET_RUN_PARSE_ERROR_CODE,
  GET_RUN_PARSE_ERROR_RESPONSE,
  type GetRunParseErrorCode,
} from './getRunRouteParser.constants.js';
import {
  normalizeRequiredString,
  parseBooleanQuery,
  parseRequiredTenantId,
} from './routeParserPrimitives.js';

export interface ParsedGetRunRequest {
  readonly useCaseInput: {
    readonly runId: string;
    readonly enriched: boolean;
  };
  readonly requestedScope: RequestedScope & {
    readonly action: typeof GET_RUN_ACTION;
  };
}

type ParsedGetRunResult =
  | { readonly ok: true; readonly value: ParsedGetRunRequest }
  | {
      readonly ok: false;
      readonly status: 400 | 403;
      readonly body: {
        readonly error:
          | typeof GET_RUN_PARSE_ERROR_RESPONSE.BAD_REQUEST
          | typeof GET_RUN_PARSE_ERROR_RESPONSE.FORBIDDEN;
        readonly code: GetRunParseErrorCode;
      };
    };

type GetRunBadRequestCode =
  | typeof GET_RUN_PARSE_ERROR_CODE.INVALID_RUN_ID
  | typeof GET_RUN_PARSE_ERROR_CODE.INVALID_TENANT_ID
  | typeof GET_RUN_PARSE_ERROR_CODE.INVALID_ENRICHED_FLAG;

type GetRunForbiddenCode = typeof GET_RUN_PARSE_ERROR_CODE.MISSING_TENANT_SCOPE;

export function parseGetRunRequest(input: {
  readonly runId: string | undefined;
  readonly tenantId: string | undefined;
  readonly enriched: string | undefined;
}): ParsedGetRunResult {
  const runId = normalizeRequiredString(input.runId);
  if (!runId) {
    return badRequest(GET_RUN_PARSE_ERROR_CODE.INVALID_RUN_ID);
  }

  const tenant = parseRequiredTenantId(input.tenantId);
  if (tenant.kind === 'missing') {
    return forbidden(GET_RUN_PARSE_ERROR_CODE.MISSING_TENANT_SCOPE);
  }
  if (tenant.kind === 'invalid') {
    return badRequest(GET_RUN_PARSE_ERROR_CODE.INVALID_TENANT_ID);
  }

  const enriched = parseBooleanQuery(input.enriched);
  if (!enriched.ok) {
    return badRequest(GET_RUN_PARSE_ERROR_CODE.INVALID_ENRICHED_FLAG);
  }

  return {
    ok: true,
    value: {
      useCaseInput: {
        runId,
        enriched: enriched.value,
      },
      requestedScope: {
        tenantId: tenant.value,
        action: GET_RUN_ACTION,
      },
    },
  };
}

function badRequest(code: GetRunBadRequestCode): ParsedGetRunResult {
  return {
    ok: false,
    status: 400,
    body: { error: GET_RUN_PARSE_ERROR_RESPONSE.BAD_REQUEST, code },
  };
}

function forbidden(code: GetRunForbiddenCode): ParsedGetRunResult {
  return {
    ok: false,
    status: 403,
    body: { error: GET_RUN_PARSE_ERROR_RESPONSE.FORBIDDEN, code },
  };
}
