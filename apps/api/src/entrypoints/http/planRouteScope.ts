import type { RunContextSchemaT } from '@dvt/contracts';
import { parseRunContext } from '@dvt/contracts';

import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { badRequestResult, type RouteParseResult } from './routeParseIssue.js';
import { parseStartRunScope, type ParsedStartRunScope } from './startRunRouteScopeParser.js';

export type ParsedPlanRouteContext = ParsedStartRunScope &
  Pick<RunContextSchemaT, 'targetAdapter'>;

export function parsePlanRouteContextRecord(
  record: Record<string, unknown>
): RouteParseResult<ParsedPlanRouteContext> {
  const context = parsePlanRouteContext(record.context);
  if (!context.ok) {
    return context;
  }

  return mapPlanRouteContext(context.value);
}

function parsePlanRouteContext(raw: unknown): RouteParseResult<RunContextSchemaT> {
  if (!isObjectRecord(raw)) {
    return badRequestResult<RunContextSchemaT>(HTTP_ERROR_REASON.invalidBody);
  }

  try {
    return {
      ok: true,
      value: parseRunContext(raw),
    };
  } catch {
    return badRequestResult<RunContextSchemaT>(HTTP_ERROR_REASON.invalidBody);
  }
}

function mapPlanRouteContext(
  context: RunContextSchemaT
): RouteParseResult<ParsedPlanRouteContext> {
  const scopeResult = parseStartRunScope({
    tenantId: context.tenantId,
    projectId: context.projectId,
    environmentId: context.environmentId,
  });
  if (!scopeResult.ok) {
    return scopeResult;
  }

  return {
    ok: true,
    value: {
      ...scopeResult.value,
      targetAdapter: context.targetAdapter,
    },
  };
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
