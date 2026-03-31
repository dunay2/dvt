import type { RequestedScope } from '../../domain/auth/types.js';

import { GET_RUN_ACTION } from './getRunRouteParser.constants.js';
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
    return badRequestResult('invalid_run_id', { target: 'runId' });
  }

  const tenant = parseRequiredTenantId(input.tenantId);
  if (tenant.kind === 'missing') {
    return forbiddenResult('missing_tenant_scope', { target: 'tenantId' });
  }
  if (tenant.kind === 'invalid') {
    return badRequestResult('invalid_tenant_id', { target: 'tenantId' });
  }

  const enriched = parseBooleanQuery(input.enriched);
  if (!enriched.ok) {
    return badRequestResult('invalid_enriched_flag', { target: 'enriched' });
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
