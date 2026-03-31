import type { RequestedScope } from '../../domain/auth/types.js';

import { GET_RUN_EVENTS_ACTION, GET_RUN_EVENTS_LIMIT } from './getRunEventsRouteParser.constants.js';
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
    return badRequestResult('invalid_run_id', { target: 'runId' });
  }

  const tenant = parseRequiredTenantId(input.tenantId);
  if (tenant.kind === 'missing') {
    return forbiddenResult('missing_tenant_scope', { target: 'tenantId' });
  }
  if (tenant.kind === 'invalid') {
    return badRequestResult('invalid_tenant_id', { target: 'tenantId' });
  }

  const afterSeq = parseOptionalInt(input.afterSeq);
  if (afterSeq === null) {
    return badRequestResult('invalid_after_seq', { target: 'afterSeq' });
  }

  const limit = parseOptionalInt(input.limit);
  if (limit === null) {
    return badRequestResult('invalid_limit', { target: 'limit' });
  }
  if (limit !== undefined && (limit <= 0 || limit > GET_RUN_EVENTS_LIMIT.MAX)) {
    return badRequestResult('limit_out_of_range', { target: 'limit' });
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
        tenantId: tenant.value,
        action: GET_RUN_EVENTS_ACTION,
      },
    },
  };
}
