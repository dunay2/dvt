import { parseExecutionSelection } from '@dvt/contracts';

import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { badRequestResult, type RouteParseResult } from './routeParseIssue.js';

export function parsePlanRouteSelection(
  selection: unknown
): RouteParseResult<import('@dvt/contracts').ExecutionSelection> {
  try {
    return {
      ok: true,
      value: parseExecutionSelection(selection),
    };
  } catch {
    return badRequestResult(HTTP_ERROR_REASON.invalidSelection, {
      target: 'selection',
    });
  }
}
