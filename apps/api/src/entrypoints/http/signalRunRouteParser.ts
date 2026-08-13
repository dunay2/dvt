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
import { RUN_COMMAND_ACTION } from './runCommandRoute.constants.js';

const SUPPORTED_SIGNAL_TYPES: ReadonlySet<SupportedSignalType> = new Set(['PAUSE', 'RESUME']);

export interface ParsedSignalRunRequest {
  readonly command: {
    readonly runId: string;
    readonly signalType: SupportedSignalType;
    readonly reason?: string;
  };
  readonly authorization: {
    readonly tenantId: TenantId;
    readonly actionName: typeof RUN_COMMAND_ACTION.SIGNAL;
  };
}

type ParsedSignalRunResult = RouteParseResult<ParsedSignalRunRequest>;

export function parseSignalRunRequest(input: {
  readonly runId: string | undefined;
  readonly body: unknown;
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

  const signalType = parseSignalType(input.body.signalType);
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
        actionName: RUN_COMMAND_ACTION.SIGNAL,
      },
    },
  };
}

function parseSignalType(raw: unknown): SupportedSignalType | null {
  if (typeof raw !== 'string') return null;
  const normalized = raw.trim().toUpperCase() as SupportedSignalType;
  return SUPPORTED_SIGNAL_TYPES.has(normalized) ? normalized : null;
}
