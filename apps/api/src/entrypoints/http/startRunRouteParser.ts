/**
 * Owned concern: parse the start-run HTTP body into a canonical command plus
 * requested authorization scope for the route seam.
 */
import type { StartRunCommand } from '@dvt/contracts';

import {
  AUTHORIZATION_ACTION,
  buildEnvironmentAccessScope,
  type CommandAuthorizationAction,
  type RequestedScope,
} from '../../application/ports/accessDecision.js';
import type { IStartRunTargetAdapterRegistry } from '../../application/ports/IStartRunTargetAdapterRegistry.js';

import { parsePlanRouteBodyRecord } from './planRouteBodyParser.js';
import { parsePlanRouteScope } from './planRouteScopeParser.js';
import type { RouteParseResult } from './routeParseIssue.js';
import type { StartRunRunIdGenerator } from './startRunIdentity.js';
import { parseStartRunCommand } from './startRunRouteCommandBuilder.js';

type ParsedStartRunRequest = {
  readonly command: StartRunCommand;
  readonly requestedScope: RequestedScope<CommandAuthorizationAction>;
};

type ParseStartRunRequestResult = RouteParseResult<ParsedStartRunRequest>;

export function parseStartRunBody(
  body: unknown,
  adapterRegistry: IStartRunTargetAdapterRegistry,
  runIdGenerator: StartRunRunIdGenerator
): ParseStartRunRequestResult {
  const bodyRecord = parsePlanRouteBodyRecord(body);
  if (!bodyRecord.ok) {
    return bodyRecord;
  }

  const scope = parsePlanRouteScope(bodyRecord.value);
  if (!scope.ok) {
    return scope;
  }

  const command = parseStartRunCommand(bodyRecord.value, adapterRegistry, runIdGenerator);
  if (!command.ok) {
    return command;
  }

  return {
    ok: true,
    value: {
      command: command.value,
      requestedScope: {
        ...buildEnvironmentAccessScope(
          scope.value.tenantId,
          scope.value.projectId,
          scope.value.environmentId
        ),
        action: AUTHORIZATION_ACTION.runStart,
      },
    },
  };
}
