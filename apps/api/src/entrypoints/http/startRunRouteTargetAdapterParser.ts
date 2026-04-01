import type { StartRunCommand } from '../../application/ports/startRunCommandContract.js';
import { isStartRunTargetAdapter } from '../../application/ports/startRunCommandContract.js';

import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { badRequestResult, type RouteParseResult } from './routeParseIssue.js';
import { asNonEmptyTrimmedStringOrUndefined } from './startRunRouteBodyValidation.js';

export function parseStartRunTargetAdapter(
  rawTargetAdapter: unknown
): RouteParseResult<StartRunCommand['targetAdapter']> {
  const normalized = asNonEmptyTrimmedStringOrUndefined(rawTargetAdapter);
  if (normalized === undefined || !isStartRunTargetAdapter(normalized)) {
    return badRequestResult(HTTP_ERROR_REASON.invalidTargetAdapter, { target: 'targetAdapter' });
  }

  return { ok: true, value: normalized };
}
