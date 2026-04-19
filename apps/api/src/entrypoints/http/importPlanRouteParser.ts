import type { ImportPlanCommand } from '../../application/services/ImportPlanUseCase.js';

import { toContractPlanRef } from './planRefHttpMapper.js';
import { parsePlanRouteBodyRecord } from './planRouteBodyParser.js';
import { parsePlanRoutePlanRef } from './planRoutePlanRefParser.js';
import { type ParsedPlanRouteContext, parsePlanRouteContextRecord } from './planRouteScope.js';
import { type RouteParseResult } from './routeParseIssue.js';

export interface ParsedImportPlanRouteInput {
  readonly routeContext: ParsedPlanRouteContext;
  readonly command: ImportPlanCommand;
}

export function parseImportPlanRouteInput(
  body: unknown
): RouteParseResult<ParsedImportPlanRouteInput> {
  const bodyRecord = parsePlanRouteBodyRecord(body);
  if (!bodyRecord.ok) {
    return bodyRecord;
  }

  const routeContext = parsePlanRouteContextRecord(bodyRecord.value);
  if (!routeContext.ok) {
    return routeContext;
  }

  const planRef = parsePlanRoutePlanRef(bodyRecord.value.planRef);
  if (!planRef.ok) {
    return planRef;
  }

  return {
    ok: true,
    value: {
      routeContext: routeContext.value,
      command: {
        planRef: toContractPlanRef(planRef.value),
        tenantId: routeContext.value.tenantId.value,
        projectId: routeContext.value.projectId.value,
        environmentId: routeContext.value.environmentId.value,
      },
    },
  };
}
