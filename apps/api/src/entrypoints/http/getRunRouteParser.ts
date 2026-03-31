import type { RequestedScope } from '../../domain/auth/types.js';

import { GET_RUN_ACTION } from './getRunRouteParser.constants.js';
import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { badRequestResult, forbiddenResult, type RouteParseResult } from './routeParseIssue.js';
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

type ParsedGetRunResult = RouteParseResult<ParsedGetRunRequest>;

export function parseGetRunRequest(input: {
  readonly runId: string | undefined;
  readonly tenantId: string | undefined;
  readonly enriched: string | undefined;
}): ParsedGetRunResult {
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

  const enriched = parseBooleanQuery(input.enriched);
  if (!enriched.ok) {
    return badRequestResult(HTTP_ERROR_REASON.invalidEnrichedFlag, { target: 'enriched' });
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
