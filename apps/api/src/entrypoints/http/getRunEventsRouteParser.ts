import type { RequestedScope } from '../../domain/auth/types.js';

import {
  GET_RUN_EVENTS_ACTION,
  GET_RUN_EVENTS_LIMIT,
  GET_RUN_EVENTS_PARSE_ERROR_CODE,
  GET_RUN_EVENTS_PARSE_ERROR_RESPONSE,
  type GetRunEventsParseErrorCode,
} from './getRunEventsRouteParser.constants.js';
import {
  normalizeRequiredString,
  parseOptionalInt,
  parseRequiredTenantId,
} from './routeParserPrimitives.js';

export interface ParsedGetRunEventsRequest {
  readonly useCaseInput: {
    readonly runId: string;
    readonly afterSeq?: number;
    readonly limit?: number;
  };
  readonly requestedScope: RequestedScope & {
    readonly action: typeof GET_RUN_EVENTS_ACTION;
  };
}

type ParsedGetRunEventsResult =
  | { readonly ok: true; readonly value: ParsedGetRunEventsRequest }
  | {
      readonly ok: false;
      readonly status: 400 | 403;
      readonly body: {
        readonly error:
          | typeof GET_RUN_EVENTS_PARSE_ERROR_RESPONSE.BAD_REQUEST
          | typeof GET_RUN_EVENTS_PARSE_ERROR_RESPONSE.FORBIDDEN;
        readonly code: GetRunEventsParseErrorCode;
      };
    };

type GetRunEventsBadRequestCode =
  | typeof GET_RUN_EVENTS_PARSE_ERROR_CODE.INVALID_RUN_ID
  | typeof GET_RUN_EVENTS_PARSE_ERROR_CODE.INVALID_TENANT_ID
  | typeof GET_RUN_EVENTS_PARSE_ERROR_CODE.INVALID_AFTER_SEQ
  | typeof GET_RUN_EVENTS_PARSE_ERROR_CODE.INVALID_LIMIT
  | typeof GET_RUN_EVENTS_PARSE_ERROR_CODE.LIMIT_OUT_OF_RANGE;

type GetRunEventsForbiddenCode = typeof GET_RUN_EVENTS_PARSE_ERROR_CODE.MISSING_TENANT_SCOPE;

export function parseGetRunEventsRequest(input: {
  readonly runId: string | undefined;
  readonly tenantId: string | undefined;
  readonly afterSeq: string | undefined;
  readonly limit: string | undefined;
}): ParsedGetRunEventsResult {
  const runId = normalizeRequiredString(input.runId);
  if (!runId) {
    return badRequest(GET_RUN_EVENTS_PARSE_ERROR_CODE.INVALID_RUN_ID);
  }

  const tenant = parseRequiredTenantId(input.tenantId);
  if (tenant.kind === 'missing') {
    return forbidden(GET_RUN_EVENTS_PARSE_ERROR_CODE.MISSING_TENANT_SCOPE);
  }
  if (tenant.kind === 'invalid') {
    return badRequest(GET_RUN_EVENTS_PARSE_ERROR_CODE.INVALID_TENANT_ID);
  }

  const afterSeq = parseOptionalInt(input.afterSeq);
  if (afterSeq === null) {
    return badRequest(GET_RUN_EVENTS_PARSE_ERROR_CODE.INVALID_AFTER_SEQ);
  }

  const limit = parseOptionalInt(input.limit);
  if (limit === null) {
    return badRequest(GET_RUN_EVENTS_PARSE_ERROR_CODE.INVALID_LIMIT);
  }
  if (limit !== undefined && (limit <= 0 || limit > GET_RUN_EVENTS_LIMIT.MAX)) {
    return badRequest(GET_RUN_EVENTS_PARSE_ERROR_CODE.LIMIT_OUT_OF_RANGE);
  }

  return {
    ok: true,
    value: {
      useCaseInput: {
        runId,
        ...(afterSeq !== undefined ? { afterSeq } : {}),
        ...(limit !== undefined ? { limit } : {}),
      },
      requestedScope: {
        tenantId: tenant.value,
        action: GET_RUN_EVENTS_ACTION,
      },
    },
  };
}

function badRequest(code: GetRunEventsBadRequestCode): ParsedGetRunEventsResult {
  return {
    ok: false,
    status: 400,
    body: { error: GET_RUN_EVENTS_PARSE_ERROR_RESPONSE.BAD_REQUEST, code },
  };
}

function forbidden(code: GetRunEventsForbiddenCode): ParsedGetRunEventsResult {
  return {
    ok: false,
    status: 403,
    body: { error: GET_RUN_EVENTS_PARSE_ERROR_RESPONSE.FORBIDDEN, code },
  };
}
