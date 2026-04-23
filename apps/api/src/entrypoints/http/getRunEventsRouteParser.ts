/**
 * Owned concern: parse the protected get-run-events HTTP request into
 * canonical timeline input and requested access scope.
 */
import {
  buildTenantAccessScope,
  type RequestedScope,
} from '../../application/ports/accessDecision.js';

import {
  GET_RUN_EVENTS_ACTION,
  GET_RUN_EVENTS_LIMIT,
} from './getRunEventsRouteParser.constants.js';
import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { badRequestResult, forbiddenResult, type RouteParseResult } from './routeParseIssue.js';
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

type ParsedGetRunEventsResult = RouteParseResult<ParsedGetRunEventsRequest>;

export function parseGetRunEventsRequest(input: {
  readonly runId: string | undefined;
  readonly tenantId: string | undefined;
  readonly afterSeq: string | undefined;
  readonly limit: string | undefined;
}): ParsedGetRunEventsResult {
  const runId = normalizeRequiredString(input.runId);
  if (!runId) {
    return badRequestResult(HTTP_ERROR_REASON.invalidRunId, { target: 'runId' });
  }

  const tenant = parseRequiredTenantId(input.tenantId);
  if (tenant.kind === 'missing') {
    return forbiddenResult(HTTP_ERROR_REASON.missingTenantScope, { target: 'tenantId' });
  }
  if (tenant.kind === 'invalid') {
    return badRequestResult(HTTP_ERROR_REASON.invalidTenantId, { target: 'tenantId' });
  }

  const afterSeq = parseOptionalInt(input.afterSeq);
  if (afterSeq === null) {
    return badRequestResult(HTTP_ERROR_REASON.invalidAfterSeq, { target: 'afterSeq' });
  }

  const limit = parseOptionalInt(input.limit);
  if (limit === null) {
    return badRequestResult(HTTP_ERROR_REASON.invalidLimit, { target: 'limit' });
  }
  if (limit !== undefined && (limit <= 0 || limit > GET_RUN_EVENTS_LIMIT.MAX)) {
    return badRequestResult(HTTP_ERROR_REASON.limitOutOfRange, { target: 'limit' });
  }

  return {
    ok: true,
    value: {
      useCaseInput: {
        runId,
        ...(afterSeq === undefined ? {} : { afterSeq }),
        ...(limit === undefined ? {} : { limit }),
      },
      requestedScope: {
        ...buildTenantAccessScope(tenant.value),
        action: GET_RUN_EVENTS_ACTION,
      },
    },
  };
}
