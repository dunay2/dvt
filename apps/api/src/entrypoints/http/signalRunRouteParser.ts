import type { SupportedSignalType } from '../../application/ports/runtime.js';
import type { TenantId } from '../../domain/auth/types.js';

import {
  badRequest,
  forbidden,
  isBodyObject,
  normalizeRunId,
  parseOptionalReason,
  parseTenantId,
} from './runCommandFieldParsers.js';
import {
  SIGNAL_ACTION_BY_TYPE,
  SIGNAL_RUN_PARSE_ERROR_CODE,
  SUPPORTED_SIGNAL_TYPES,
  type SignalCommandActionName,
  type SignalRouteCompatibilityPolicy,
} from './signalRunRouteParser.constants.js';

export {
  SIGNAL_ROUTE_COMPATIBILITY_POLICY,
  SIGNAL_COMMAND_ACTION,
  SIGNAL_RUN_PARSE_ERROR_CODE,
  type SignalCommandActionName,
  type SignalRouteCompatibilityPolicy,
} from './signalRunRouteParser.constants.js';

type SignalRunParseErrorCodes<
  TInvalidRunId extends string,
  TInvalidBody extends string,
  TInvalidSignalType extends string,
  TMissingTenantScope extends string,
  TInvalidTenantId extends string,
> = {
  readonly INVALID_RUN_ID: TInvalidRunId;
  readonly INVALID_BODY: TInvalidBody;
  readonly INVALID_SIGNAL_TYPE: TInvalidSignalType;
  readonly MISSING_TENANT_SCOPE: TMissingTenantScope;
  readonly INVALID_TENANT_ID: TInvalidTenantId;
};

type SignalRunDefaultParseErrorCode =
  | (typeof SIGNAL_RUN_PARSE_ERROR_CODE)['INVALID_RUN_ID']
  | (typeof SIGNAL_RUN_PARSE_ERROR_CODE)['INVALID_BODY']
  | (typeof SIGNAL_RUN_PARSE_ERROR_CODE)['INVALID_SIGNAL_TYPE']
  | (typeof SIGNAL_RUN_PARSE_ERROR_CODE)['MISSING_TENANT_SCOPE']
  | (typeof SIGNAL_RUN_PARSE_ERROR_CODE)['INVALID_TENANT_ID'];

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

type ParsedSignalRunResult<TCode extends string = SignalRunDefaultParseErrorCode> =
  | { readonly ok: true; readonly value: ParsedSignalRunRequest }
  | {
      readonly ok: false;
      readonly status: 400 | 403;
      readonly body: {
        readonly error: 'BAD_REQUEST' | 'FORBIDDEN';
        readonly code: TCode;
      };
    };

export function parseSignalRunRequest<
  TInvalidRunId extends string = (typeof SIGNAL_RUN_PARSE_ERROR_CODE)['INVALID_RUN_ID'],
  TInvalidBody extends string = (typeof SIGNAL_RUN_PARSE_ERROR_CODE)['INVALID_BODY'],
  TInvalidSignalType extends string = (typeof SIGNAL_RUN_PARSE_ERROR_CODE)['INVALID_SIGNAL_TYPE'],
  TMissingTenantScope extends string = (typeof SIGNAL_RUN_PARSE_ERROR_CODE)['MISSING_TENANT_SCOPE'],
  TInvalidTenantId extends string = (typeof SIGNAL_RUN_PARSE_ERROR_CODE)['INVALID_TENANT_ID'],
>(
  input: {
    readonly runId: string | undefined;
    readonly body: unknown;
    readonly compatibilityPolicy: SignalRouteCompatibilityPolicy;
  },
  codes?: SignalRunParseErrorCodes<
    TInvalidRunId,
    TInvalidBody,
    TInvalidSignalType,
    TMissingTenantScope,
    TInvalidTenantId
  >
): ParsedSignalRunResult<
  TInvalidRunId | TInvalidBody | TInvalidSignalType | TMissingTenantScope | TInvalidTenantId
> {
  const resolvedCodes =
    codes ??
    (SIGNAL_RUN_PARSE_ERROR_CODE as unknown as SignalRunParseErrorCodes<
      TInvalidRunId,
      TInvalidBody,
      TInvalidSignalType,
      TMissingTenantScope,
      TInvalidTenantId
    >);
  const runId = normalizeRunId(input.runId);
  if (!runId) {
    return badRequest(resolvedCodes.INVALID_RUN_ID);
  }

  if (!isBodyObject(input.body)) {
    return badRequest(resolvedCodes.INVALID_BODY);
  }

  const tenantIdResult = parseTenantId(input.body, {
    MISSING_TENANT_SCOPE: resolvedCodes.MISSING_TENANT_SCOPE,
    INVALID_TENANT_ID: resolvedCodes.INVALID_TENANT_ID,
  });
  if (!tenantIdResult.ok) {
    return tenantIdResult.error === resolvedCodes.MISSING_TENANT_SCOPE
      ? forbidden(tenantIdResult.error)
      : badRequest(tenantIdResult.error);
  }

  const signalType = parseSignalType(input.body.signalType, input.compatibilityPolicy);
  if (!signalType) {
    return badRequest(resolvedCodes.INVALID_SIGNAL_TYPE);
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
