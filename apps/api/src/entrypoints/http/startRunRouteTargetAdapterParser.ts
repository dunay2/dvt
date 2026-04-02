import type { IStartRunTargetAdapterRegistry } from '../../application/ports/IStartRunTargetAdapterRegistry.js';
import type { StartRunCommand } from '../../application/ports/startRunCommandContract.js';
import { DEFAULT_START_RUN_TARGET_ADAPTER_REGISTRY } from '../../application/services/startRunTargetAdapterRegistry.js';

import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { badRequestResult, type RouteParseResult } from './routeParseIssue.js';
import { asNonEmptyTrimmedStringOrUndefined } from './startRunRouteBodyValidation.js';

export function parseStartRunTargetAdapter(
  rawTargetAdapter: unknown,
  registry: IStartRunTargetAdapterRegistry = DEFAULT_START_RUN_TARGET_ADAPTER_REGISTRY
): RouteParseResult<StartRunCommand['targetAdapter']> {
  const normalized = asNonEmptyTrimmedStringOrUndefined(rawTargetAdapter);
  if (normalized === undefined || !registry.isSupported(normalized)) {
    return badRequestResult(HTTP_ERROR_REASON.invalidTargetAdapter, { target: 'targetAdapter' });
  }

  return { ok: true, value: normalized };
}
