import type { TenantId } from '../../domain/auth/types.js';

import {
  badRequest,
  forbidden,
  isBodyObject,
  normalizeRunId,
  parseOptionalReason,
  parseTenantId,
} from './runCommandFieldParsers.js';
import { RUN_COMMAND_ACTION, RUN_COMMAND_PARSE_ERROR_CODE } from './runCommandRoute.constants.js';

const CANCEL_SIGNAL_TYPE = 'CANCEL' as const;

type CancelRunParseErrorCodes<
  TInvalidRunId extends string,
  TInvalidBody extends string,
  TMissingTenantScope extends string,
  TInvalidTenantId extends string,
> = {
  readonly INVALID_RUN_ID: TInvalidRunId;
  readonly INVALID_BODY: TInvalidBody;
  readonly MISSING_TENANT_SCOPE: TMissingTenantScope;
  readonly INVALID_TENANT_ID: TInvalidTenantId;
};

type CancelRunDefaultParseErrorCode =
  | (typeof RUN_COMMAND_PARSE_ERROR_CODE)['INVALID_RUN_ID']
  | (typeof RUN_COMMAND_PARSE_ERROR_CODE)['INVALID_BODY']
  | (typeof RUN_COMMAND_PARSE_ERROR_CODE)['MISSING_TENANT_SCOPE']
  | (typeof RUN_COMMAND_PARSE_ERROR_CODE)['INVALID_TENANT_ID'];

export interface ParsedCancelRunRequest {
  readonly command: {
    readonly runId: string;
    readonly signalType: typeof CANCEL_SIGNAL_TYPE;
    readonly reason?: string;
  };
  readonly authorization: {
    readonly tenantId: TenantId;
    readonly actionName: typeof RUN_COMMAND_ACTION.CANCEL;
  };
}

type ParsedCancelRunResult<TCode extends string = CancelRunDefaultParseErrorCode> =
  | { readonly ok: true; readonly value: ParsedCancelRunRequest }
  | {
      readonly ok: false;
      readonly status: 400 | 403;
      readonly body: {
        readonly error: 'BAD_REQUEST' | 'FORBIDDEN';
        readonly code: TCode;
      };
    };

export function parseCancelRunRequest<
  TInvalidRunId extends string = (typeof RUN_COMMAND_PARSE_ERROR_CODE)['INVALID_RUN_ID'],
  TInvalidBody extends string = (typeof RUN_COMMAND_PARSE_ERROR_CODE)['INVALID_BODY'],
  TMissingTenantScope extends string =
    (typeof RUN_COMMAND_PARSE_ERROR_CODE)['MISSING_TENANT_SCOPE'],
  TInvalidTenantId extends string = (typeof RUN_COMMAND_PARSE_ERROR_CODE)['INVALID_TENANT_ID'],
>(
  input: {
    readonly runId: string | undefined;
    readonly body: unknown;
  },
  codes?: CancelRunParseErrorCodes<
    TInvalidRunId,
    TInvalidBody,
    TMissingTenantScope,
    TInvalidTenantId
  >
): ParsedCancelRunResult<TInvalidRunId | TInvalidBody | TMissingTenantScope | TInvalidTenantId> {
  const resolvedCodes =
    codes ??
    (RUN_COMMAND_PARSE_ERROR_CODE as unknown as CancelRunParseErrorCodes<
      TInvalidRunId,
      TInvalidBody,
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

  const reason = parseOptionalReason(input.body.reason);

  return {
    ok: true,
    value: {
      command: {
        runId,
        signalType: CANCEL_SIGNAL_TYPE,
        ...(reason ? { reason } : {}),
      },
      authorization: {
        tenantId: tenantIdResult.value,
        actionName: RUN_COMMAND_ACTION.CANCEL,
      },
    },
  };
}
