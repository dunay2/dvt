import type { TenantId } from '../../domain/auth/types.js';

import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { badRequestResult, type RouteParseResult } from './routeParseIssue.js';
import {
  isBodyObject,
  normalizeRunId,
  parseOptionalReason,
  parseTenantId,
} from './runCommandFieldParsers.js';
import { RUN_COMMAND_ACTION } from './runCommandRoute.constants.js';

const CANCEL_SIGNAL_TYPE = 'CANCEL' as const;

export interface ParsedCancelRunRequest {
  readonly command: {
    readonly runId: string;
    readonly signalType: typeof CANCEL_SIGNAL_TYPE;
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
    return badRequestResult(HTTP_ERROR_REASON.invalidRunId, { target: 'runId' });
  }

  if (!isBodyObject(input.body)) {
    return badRequestResult(HTTP_ERROR_REASON.invalidBody);
  }

  const tenantIdResult = parseTenantId(input.body);
  if (!tenantIdResult.ok) {
    return tenantIdResult;
  }

  const reason = parseOptionalReason(input.body.reason);
  if (reason !== undefined) {
    return badRequestResult(HTTP_ERROR_REASON.cancelReasonNotSupported, {
      target: 'reason',
    });
  }

  return {
    ok: true,
    value: {
      command: {
        runId,
        signalType: CANCEL_SIGNAL_TYPE,
      },
      authorization: {
        tenantId: tenantIdResult.value,
        actionName: RUN_COMMAND_ACTION.CANCEL,
      },
    },
  };
}
