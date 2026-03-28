import type { SupportedSignalType } from '../../application/ports/runtime.js';
import { TenantId } from '../../domain/auth/types.js';

import {
  SIGNAL_COMMAND_ACTION,
  SIGNAL_RUN_PARSE_ERROR_CODE,
  SIGNAL_RUN_PARSE_ERROR_RESPONSE,
  type SignalRunParseErrorCode,
} from './signalRunRouteParser.constants.js';

const CANCEL_SIGNAL_TYPE: SupportedSignalType = 'CANCEL';

export interface ParsedCancelRunRequest {
  readonly command: {
    readonly runId: string;
    readonly signalType: typeof CANCEL_SIGNAL_TYPE;
    readonly reason?: string;
  };
  readonly authorization: {
    readonly tenantId: TenantId;
    readonly actionName: typeof SIGNAL_COMMAND_ACTION.CANCEL;
  };
}

type ParsedCancelRunResult =
  | { readonly ok: true; readonly value: ParsedCancelRunRequest }
  | {
      readonly ok: false;
      readonly status: 400 | 403;
      readonly body: {
        readonly error:
          | typeof SIGNAL_RUN_PARSE_ERROR_RESPONSE.BAD_REQUEST
          | typeof SIGNAL_RUN_PARSE_ERROR_RESPONSE.FORBIDDEN;
        readonly code: SignalRunParseErrorCode;
      };
    };

type BadRequestErrorCode =
  | typeof SIGNAL_RUN_PARSE_ERROR_CODE.INVALID_RUN_ID
  | typeof SIGNAL_RUN_PARSE_ERROR_CODE.INVALID_BODY
  | typeof SIGNAL_RUN_PARSE_ERROR_CODE.INVALID_TENANT_ID;

type ForbiddenErrorCode = typeof SIGNAL_RUN_PARSE_ERROR_CODE.MISSING_TENANT_SCOPE;

export {
  SIGNAL_COMMAND_ACTION,
  SIGNAL_RUN_PARSE_ERROR_CODE,
  type SignalRunParseErrorCode,
} from './signalRunRouteParser.constants.js';

export function parseCancelRunRequest(input: {
  readonly runId: string | undefined;
  readonly body: unknown;
}): ParsedCancelRunResult {
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
        actionName: SIGNAL_COMMAND_ACTION.CANCEL,
      },
    },
  };
}

function parseTenantId(body: Record<string, unknown>):
  | { readonly ok: true; readonly value: TenantId }
  | {
      readonly ok: false;
      readonly error:
        | typeof SIGNAL_RUN_PARSE_ERROR_CODE.MISSING_TENANT_SCOPE
        | typeof SIGNAL_RUN_PARSE_ERROR_CODE.INVALID_TENANT_ID;
    } {
  if (!Object.hasOwn(body, 'tenantId') || body.tenantId === undefined) {
    return { ok: false, error: SIGNAL_RUN_PARSE_ERROR_CODE.MISSING_TENANT_SCOPE };
  }

  const rawTenantId = readString(body.tenantId);
  if (rawTenantId === undefined) {
    return { ok: false, error: SIGNAL_RUN_PARSE_ERROR_CODE.INVALID_TENANT_ID };
  }

  const tenant = TenantId.parse(rawTenantId);
  if (!tenant.ok) {
    return { ok: false, error: SIGNAL_RUN_PARSE_ERROR_CODE.INVALID_TENANT_ID };
  }

  return { ok: true, value: tenant.value };
}

function normalizeRunId(raw: string | undefined): string | null {
  const normalized = raw?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
}

function isBodyObject(raw: unknown): raw is Record<string, unknown> {
  return raw !== null && typeof raw === 'object' && !Array.isArray(raw);
}

function readString(raw: unknown): string | undefined {
  return typeof raw === 'string' ? raw : undefined;
}

function parseOptionalReason(raw: unknown): string | undefined {
  if (typeof raw !== 'string') {
    return undefined;
  }

  const normalized = raw.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function badRequest(code: BadRequestErrorCode): ParsedCancelRunResult {
  return {
    ok: false,
    status: 400,
    body: {
      error: SIGNAL_RUN_PARSE_ERROR_RESPONSE.BAD_REQUEST,
      code,
    },
  };
}

function forbidden(code: ForbiddenErrorCode): ParsedCancelRunResult {
  return {
    ok: false,
    status: 403,
    body: {
      error: SIGNAL_RUN_PARSE_ERROR_RESPONSE.FORBIDDEN,
      code,
    },
  };
}
