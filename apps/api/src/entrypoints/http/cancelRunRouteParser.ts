import type { TenantId } from '../../domain/auth/types.js';

import {
  isBodyObject,
  normalizeRunId,
  parseOptionalReason,
  parseTenantId,
} from './runCommandFieldParsers.js';
import { RUN_COMMAND_ACTION, RUN_COMMAND_PARSE_ERROR_CODE } from './runCommandRoute.constants.js';
import { badRequestResult, type RouteParseResult } from './routeParseIssue.js';

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

type ParsedCancelRunResult = RouteParseResult<ParsedCancelRunRequest>;

export function parseCancelRunRequest(input: {
  readonly runId: string | undefined;
  readonly body: unknown;
}): ParsedCancelRunResult {
  const runId = normalizeRunId(input.runId);
  if (!runId) {
    return badRequestResult(RUN_COMMAND_PARSE_ERROR_CODE.INVALID_RUN_ID, { target: 'runId' });
  }

  if (!isBodyObject(input.body)) {
    return badRequestResult(RUN_COMMAND_PARSE_ERROR_CODE.INVALID_BODY);
  }

  const tenantIdResult = parseTenantId(input.body);
  if (!tenantIdResult.ok) {
    return tenantIdResult;
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
