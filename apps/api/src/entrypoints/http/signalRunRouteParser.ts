import type { SupportedSignalType } from '../../application/ports/runtime.js';
import type { TenantId } from '../../domain/auth/types.js';

import {
  badRequest,
  forbidden,
  isBodyObject,
  normalizeRunId,
  parseOptionalReason,
  parseTenantId,
} from './runCommandRouteParser.shared.js';
import {
  SIGNAL_ACTION_BY_TYPE,
  SIGNAL_RUN_PARSE_ERROR_CODE,
  SUPPORTED_SIGNAL_TYPES,
  type SignalCommandActionName,
  type SignalRouteCompatibilityPolicy,
  type SignalRunParseErrorCode,
} from './signalRunRouteParser.constants.js';

export {
  SIGNAL_ROUTE_COMPATIBILITY_POLICY,
  SIGNAL_COMMAND_ACTION,
  SIGNAL_RUN_PARSE_ERROR_CODE,
  type SignalCommandActionName,
  type SignalRouteCompatibilityPolicy,
  type SignalRunParseErrorCode,
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

type ParsedSignalRunResult =
  | { readonly ok: true; readonly value: ParsedSignalRunRequest }
  | {
      readonly ok: false;
      readonly status: 400 | 403;
      readonly body: {
        readonly error: 'BAD_REQUEST' | 'FORBIDDEN';
        readonly code: SignalRunParseErrorCode;
      };
    };

export function parseSignalRunRequest(input: {
  readonly runId: string | undefined;
  readonly body: unknown;
  readonly compatibilityPolicy: SignalRouteCompatibilityPolicy;
}): ParsedSignalRunResult {
  const runId = normalizeRunId(input.runId);
  if (!runId) {
    return badRequest(SIGNAL_RUN_PARSE_ERROR_CODE.INVALID_RUN_ID);
  }

  if (!isBodyObject(input.body)) {
    return badRequest(SIGNAL_RUN_PARSE_ERROR_CODE.INVALID_BODY);
  }

  const tenantIdResult = parseTenantId(input.body);
  if (!tenantIdResult.ok) {
    return tenantIdResult.error === SIGNAL_RUN_PARSE_ERROR_CODE.MISSING_TENANT_SCOPE
      ? forbidden(tenantIdResult.error)
      : badRequest(tenantIdResult.error);
  }

  const signalType = parseSignalType(input.body.signalType, input.compatibilityPolicy);
  if (!signalType) {
    return badRequest(SIGNAL_RUN_PARSE_ERROR_CODE.INVALID_SIGNAL_TYPE);
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
