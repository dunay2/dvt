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
  RUN_COMMAND_ACTION,
  RUN_COMMAND_PARSE_ERROR_CODE,
  type RunCommandParseErrorCode,
} from './runCommandRoute.constants.js';

const CANCEL_SIGNAL_TYPE = 'CANCEL' as const;

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

type ParsedCancelRunResult =
  | { readonly ok: true; readonly value: ParsedCancelRunRequest }
  | {
      readonly ok: false;
      readonly status: 400 | 403;
      readonly body: {
        readonly error: 'BAD_REQUEST' | 'FORBIDDEN';
        readonly code: RunCommandParseErrorCode;
      };
    };

export function parseCancelRunRequest(input: {
  readonly runId: string | undefined;
  readonly body: unknown;
}): ParsedCancelRunResult {
  const runId = normalizeRunId(input.runId);
  if (!runId) {
    return badRequest(RUN_COMMAND_PARSE_ERROR_CODE.INVALID_RUN_ID);
  }

  if (!isBodyObject(input.body)) {
    return badRequest(RUN_COMMAND_PARSE_ERROR_CODE.INVALID_BODY);
  }

  const tenantIdResult = parseTenantId(input.body);
  if (!tenantIdResult.ok) {
    return tenantIdResult.error === RUN_COMMAND_PARSE_ERROR_CODE.MISSING_TENANT_SCOPE
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
