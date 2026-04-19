import type { ImportPlanCommand } from '../../application/services/ImportPlanUseCase.js';

import { toContractPlanRef } from './planRefHttpMapper.js';
import { type ParsedPlanRouteContext, parsePlanRouteContextRecord } from './planRouteScope.js';
import { type RouteParseResult } from './routeParseIssue.js';
import { parseStartRunBodyRecord } from './startRunRouteBodyValidation.js';
import { parseStartRunPlanRef } from './startRunRoutePlanRefParser.js';

export interface ParsedImportPlanRouteInput {
  readonly routeContext: ParsedPlanRouteContext;
  readonly command: ImportPlanCommand;
}

export function parseImportPlanRouteInput(
  body: unknown
): RouteParseResult<ParsedImportPlanRouteInput> {
  const bodyRecord = parseStartRunBodyRecord(body);
  if (!bodyRecord.ok) {
    return bodyRecord;
  }

  const routeContext = parsePlanRouteContextRecord(bodyRecord.value);
  if (!routeContext.ok) {
    return routeContext;
  }

  const planRef = parseStartRunPlanRef(bodyRecord.value.planRef);
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
