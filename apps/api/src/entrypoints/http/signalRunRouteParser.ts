import type { SupportedSignalType } from '../../application/ports/runtime.js';
import type { TenantId } from '../../domain/auth/types.js';

import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { badRequestResult, type RouteParseResult } from './routeParseIssue.js';
import {
  isBodyObject,
  normalizeRunId,
  parseOptionalReason,
  parseTenantId,
} from './runCommandFieldParsers.js';
import {
  SIGNAL_ACTION_BY_TYPE,
  SUPPORTED_SIGNAL_TYPES,
  type SignalCommandActionName,
  type SignalRouteCompatibilityPolicy,
} from './signalRunRouteParser.constants.js';

export {
  SIGNAL_ROUTE_COMPATIBILITY_POLICY,
  SIGNAL_COMMAND_ACTION,
  type SignalCommandActionName,
  type SignalRouteCompatibilityPolicy,
} from './signalRunRouteParser.constants.js';

export interface ParsedSignalRunRequest {
  readonly command: {
    readonly runId: string;
    readonly signalType: SupportedSignalType;
    readonly reason?: string;
  };
  readonly authorization: {
    readonly tenantId: TenantId;
    readonly actionName: SignalCommandActionName;
  };
}

type ParsedSignalRunResult = RouteParseResult<ParsedSignalRunRequest>;

export function parseSignalRunRequest(input: {
  readonly runId: string | undefined;
  readonly body: unknown;
  readonly compatibilityPolicy: SignalRouteCompatibilityPolicy;
}): ParsedSignalRunResult {
  const runId = normalizeRunId(input.runId);
  if (!runId) {
    return badRequestResult(HTTP_ERROR_REASON.invalidRunId, { target: 'runId' });
  }

  if (!isBodyObject(input.body)) {
    return badRequestResult(HTTP_ERROR_REASON.invalidBody);
  }

  const tenantIdResult = parseTenantId(input.body);
  if (!tenantIdResult.ok) {
    return tenantIdResult;
  }

  const signalType = parseSignalType(input.body.signalType, input.compatibilityPolicy);
  if (!signalType) {
    return badRequestResult(HTTP_ERROR_REASON.invalidSignalType, { target: 'signalType' });
  }

  const reason = parseOptionalReason(input.body.reason);

  return {
    ok: true,
    value: {
      command: {
        runId,
        signalType,
        ...(reason ? { reason } : {}),
      },
      authorization: {
        tenantId: tenantIdResult.value,
        actionName: SIGNAL_ACTION_BY_TYPE[signalType],
      },
    },
  };
}

function parseSignalType(
  raw: unknown,
  compatibilityPolicy: SignalRouteCompatibilityPolicy
): SupportedSignalType | null {
  if (typeof raw !== 'string') return null;
  const normalized = raw.trim().toUpperCase() as SupportedSignalType;
  if (normalized === 'CANCEL' && !compatibilityPolicy.allowCancelSignalType) {
    return null;
  }
  return SUPPORTED_SIGNAL_TYPES.has(normalized) ? normalized : null;
}
