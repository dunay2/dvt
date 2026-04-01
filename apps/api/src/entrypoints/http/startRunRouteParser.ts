import type { IStartRunTargetAdapterRegistry } from '../../application/ports/IStartRunTargetAdapterRegistry.js';
import type { StartRunCommand } from '../../application/ports/startRunCommandContract.js';
import { DEFAULT_START_RUN_TARGET_ADAPTER_REGISTRY } from '../../application/services/startRunTargetAdapterRegistry.js';
import { type AuthorizationAction, type RequestedScope } from '../../domain/auth/types.js';

import type { RouteParseResult } from './routeParseIssue.js';
import { parseStartRunBodyRecord } from './startRunRouteBodyValidation.js';
import { parseStartRunCommand } from './startRunRouteCommandBuilder.js';
import { parseStartRunScope } from './startRunRouteScopeParser.js';

type ParsedStartRunRequest = {
  readonly command: StartRunCommand;
  readonly requestedScope: RequestedScope & {
    readonly action: Extract<AuthorizationAction, { kind: 'command' }>;
  };
};

type ParseStartRunRequestResult = RouteParseResult<ParsedStartRunRequest>;

export function parseStartRunBody(
  body: unknown,
  adapterRegistry: IStartRunTargetAdapterRegistry = DEFAULT_START_RUN_TARGET_ADAPTER_REGISTRY
): ParseStartRunRequestResult {
  const bodyRecord = parseStartRunBodyRecord(body);
  if (!bodyRecord.ok) {
    return bodyRecord;
  }

  const scope = parseStartRunScope(bodyRecord.value);
  if (!scope.ok) {
    return scope;
  }

  const command = parseStartRunCommand(bodyRecord.value, adapterRegistry);
  if (!command.ok) {
    return command;
  }

  return {
    ok: true,
    value: {
      command: command.value,
      requestedScope: {
        tenantId: scope.value.tenantId,
        projectId: scope.value.projectId,
        environmentId: scope.value.environmentId,
        action: { kind: 'command', name: 'run:start' },
      },
    },
  };
}
