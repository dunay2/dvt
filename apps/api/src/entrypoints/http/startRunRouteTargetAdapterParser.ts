import type { StartRunCommand } from '@dvt/contracts';

import type { IStartRunTargetAdapterRegistry } from '../../application/ports/IStartRunTargetAdapterRegistry.js';
import { DEFAULT_START_RUN_TARGET_ADAPTER_REGISTRY } from '../../application/services/startRunTargetAdapterRegistry.js';

import { parseRouteTargetAdapter, type RouteTargetAdapterSupport } from './planRouteTargetAdapterParser.js';
import { type RouteParseResult } from './routeParseIssue.js';

export function parseStartRunTargetAdapter(
  rawTargetAdapter: unknown,
  registry: IStartRunTargetAdapterRegistry = DEFAULT_START_RUN_TARGET_ADAPTER_REGISTRY
): RouteParseResult<StartRunCommand['targetAdapter']> {
  const support: RouteTargetAdapterSupport<StartRunCommand['targetAdapter']> = {
    isSupported(value: string): value is StartRunCommand['targetAdapter'] {
      return registry.isSupported(value);
    },
  };

  return parseRouteTargetAdapter(rawTargetAdapter, support);
}
