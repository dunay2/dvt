import { TenantId } from '../../domain/auth/types.js';

import {
  RUN_COMMAND_PARSE_ERROR_CODE,
  RUN_COMMAND_PARSE_ERROR_RESPONSE,
} from './runCommandRoute.constants.js';

type TenantParseErrorCodes<TMissingTenantScope extends string, TInvalidTenantId extends string> = {
  readonly MISSING_TENANT_SCOPE: TMissingTenantScope;
  readonly INVALID_TENANT_ID: TInvalidTenantId;
};

export type ParsedRunCommandError<TCode extends string = string> = {
  readonly ok: false;
  readonly status: 400 | 403;
  readonly body: {
    readonly error:
      | typeof RUN_COMMAND_PARSE_ERROR_RESPONSE.BAD_REQUEST
      | typeof RUN_COMMAND_PARSE_ERROR_RESPONSE.FORBIDDEN;
    readonly code: TCode;
  };
};

export function normalizeRunId(raw: string | undefined): string | null {
  const normalized = raw?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
}

export function isBodyObject(raw: unknown): raw is Record<string, unknown> {
  return raw !== null && typeof raw === 'object' && !Array.isArray(raw);
}

export function parseTenantId<
  TMissingTenantScope extends string =
    (typeof RUN_COMMAND_PARSE_ERROR_CODE)['MISSING_TENANT_SCOPE'],
  TInvalidTenantId extends string = (typeof RUN_COMMAND_PARSE_ERROR_CODE)['INVALID_TENANT_ID'],
>(
  body: Record<string, unknown>,
  codes?: TenantParseErrorCodes<TMissingTenantScope, TInvalidTenantId>
):
  | { readonly ok: true; readonly value: TenantId }
  | {
      readonly ok: false;
      readonly error: TMissingTenantScope | TInvalidTenantId;
    } {
  const resolvedCodes =
    codes ??
    (RUN_COMMAND_PARSE_ERROR_CODE as unknown as TenantParseErrorCodes<
      TMissingTenantScope,
      TInvalidTenantId
    >);
  if (!Object.hasOwn(body, 'tenantId') || body.tenantId === undefined) {
    return { ok: false, error: resolvedCodes.MISSING_TENANT_SCOPE };
  }

  const rawTenantId = readString(body.tenantId);
  if (rawTenantId === undefined) {
    return { ok: false, error: resolvedCodes.INVALID_TENANT_ID };
  }

  const tenant = TenantId.parse(rawTenantId);
  if (!tenant.ok) {
    return { ok: false, error: resolvedCodes.INVALID_TENANT_ID };
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

export function badRequest<TCode extends string>(
  code: TCode
): ParsedRunCommandError<TCode> & {
  readonly body: {
    readonly error: typeof RUN_COMMAND_PARSE_ERROR_RESPONSE.BAD_REQUEST;
    readonly code: TCode;
  };
} {
  return {
    ok: false,
    status: 400,
    body: {
      error: RUN_COMMAND_PARSE_ERROR_RESPONSE.BAD_REQUEST,
      code,
    },
  };
}

export function forbidden<TCode extends string>(
  code: TCode
): ParsedRunCommandError<TCode> & {
  readonly body: {
    readonly error: typeof RUN_COMMAND_PARSE_ERROR_RESPONSE.FORBIDDEN;
    readonly code: TCode;
  };
} {
  return {
    ok: false,
    status: 403,
    body: {
      error: RUN_COMMAND_PARSE_ERROR_RESPONSE.FORBIDDEN,
      code,
    },
  };
}

function readString(raw: unknown): string | undefined {
  return typeof raw === 'string' ? raw : undefined;
}
