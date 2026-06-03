/**
 * Owned concern: adapt the generic route target-adapter parser to the
 * start-run adapter registry and canonical target-adapter type.
 */
import type { StartRunCommand } from '@dvt/contracts';

import type { IStartRunTargetAdapterRegistry } from '../../application/ports/IStartRunTargetAdapterRegistry.js';

import { parseRouteTargetAdapter, type RouteTargetAdapterSupport } from './planRouteTargetAdapterParser.js';
import { type RouteParseResult } from './routeParseIssue.js';

export function parseStartRunTargetAdapter(
  rawTargetAdapter: unknown,
  registry: IStartRunTargetAdapterRegistry
): RouteParseResult<StartRunCommand['targetAdapter']> {
  const support: RouteTargetAdapterSupport<StartRunCommand['targetAdapter']> = {
    isSupported(value: string): value is StartRunCommand['targetAdapter'] {
      return registry.isSupported(value);
    },
  };

  return parseRouteTargetAdapter(rawTargetAdapter, support);
}
