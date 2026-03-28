import { TenantId } from '../../domain/auth/types.js';

import { SIGNAL_RUN_PARSE_ERROR_CODE, SIGNAL_RUN_PARSE_ERROR_RESPONSE } from './signalRunRouteParser.constants.js';

type MissingOrInvalidTenantCode =
  | typeof SIGNAL_RUN_PARSE_ERROR_CODE.MISSING_TENANT_SCOPE
  | typeof SIGNAL_RUN_PARSE_ERROR_CODE.INVALID_TENANT_ID;

export type ParsedRunCommandError = {
  readonly ok: false;
  readonly status: 400 | 403;
  readonly body: {
    readonly error:
      | typeof SIGNAL_RUN_PARSE_ERROR_RESPONSE.BAD_REQUEST
      | typeof SIGNAL_RUN_PARSE_ERROR_RESPONSE.FORBIDDEN;
    readonly code: string;
  };
};

export function normalizeRunId(raw: string | undefined): string | null {
  const normalized = raw?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
}

export function isBodyObject(raw: unknown): raw is Record<string, unknown> {
  return raw !== null && typeof raw === 'object' && !Array.isArray(raw);
}

export function parseTenantId(body: Record<string, unknown>):
  | { readonly ok: true; readonly value: TenantId }
  | { readonly ok: false; readonly error: MissingOrInvalidTenantCode } {
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

export function parseOptionalReason(raw: unknown): string | undefined {
  if (typeof raw !== 'string') {
    return undefined;
  }

  const normalized = raw.trim();
  return normalized.length > 0 ? normalized : undefined;
}

export function badRequest<TCode extends string>(code: TCode): ParsedRunCommandError & {
  readonly body: {
    readonly error: typeof SIGNAL_RUN_PARSE_ERROR_RESPONSE.BAD_REQUEST;
    readonly code: TCode;
  };
} {
  return {
    ok: false,
    status: 400,
    body: {
      error: SIGNAL_RUN_PARSE_ERROR_RESPONSE.BAD_REQUEST,
      code,
    },
  };
}

export function forbidden<TCode extends string>(code: TCode): ParsedRunCommandError & {
  readonly body: {
    readonly error: typeof SIGNAL_RUN_PARSE_ERROR_RESPONSE.FORBIDDEN;
    readonly code: TCode;
  };
} {
  return {
    ok: false,
    status: 403,
    body: {
      error: SIGNAL_RUN_PARSE_ERROR_RESPONSE.FORBIDDEN,
      code,
    },
  };
}

function readString(raw: unknown): string | undefined {
  return typeof raw === 'string' ? raw : undefined;
}
