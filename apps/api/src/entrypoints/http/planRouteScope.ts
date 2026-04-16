import type { ExecutionPlan, RunContextSchemaT } from '@dvt/contracts';
import { parseRunContext } from '@dvt/contracts';

import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { badRequestResult, type RouteParseResult } from './routeParseIssue.js';
import { parseStartRunScope, type ParsedStartRunScope } from './startRunRouteScopeParser.js';

export type ParsedPlanRouteContext = ParsedStartRunScope &
  Pick<RunContextSchemaT, 'targetAdapter'>;

export function parsePlanRouteContextRecord(
  record: Record<string, unknown>
): RouteParseResult<ParsedPlanRouteContext> {
  if (record.context === undefined || record.context === null || typeof record.context !== 'object') {
    return badRequestResult<ParsedPlanRouteContext>(HTTP_ERROR_REASON.invalidBody);
  }

  try {
    const context = parseRunContext(record.context);
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
  } catch {
    return badRequestResult<ParsedPlanRouteContext>(HTTP_ERROR_REASON.invalidBody);
  }
}

export function isPlanOwnedByScope(
  plan: ExecutionPlan,
  context: ParsedPlanRouteContext
): boolean {
  const tags = plan.observability?.tags;
  if (tags === undefined) {
    return false;
  }
  return (
    tags['dvt.scope.tenantId'] === context.tenantId.value &&
    tags['dvt.scope.projectId'] === context.projectId.value &&
    tags['dvt.scope.environmentId'] === context.environmentId.value
  );
}
