import { TenantId } from '../../domain/auth/types.js';

import { badRequestResult, forbiddenResult, type RouteParseResult } from './routeParseIssue.js';

export function normalizeRunId(raw: string | undefined): string | null {
  const normalized = raw?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
}

export function isBodyObject(raw: unknown): raw is Record<string, unknown> {
  return raw !== null && typeof raw === 'object' && !Array.isArray(raw);
}

export function parseTenantId(body: Record<string, unknown>): RouteParseResult<TenantId> {
  if (!Object.hasOwn(body, 'tenantId') || body.tenantId === undefined) {
    return forbiddenResult('missing_tenant_scope', { target: 'tenantId' });
  }

  const rawTenantId = readString(body.tenantId);
  if (rawTenantId === undefined) {
    return badRequestResult('invalid_tenant_id', { target: 'tenantId' });
  }

  const tenant = TenantId.parse(rawTenantId);
  if (!tenant.ok) {
    return badRequestResult('invalid_tenant_id', { target: 'tenantId' });
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

function readString(raw: unknown): string | undefined {
  return typeof raw === 'string' ? raw : undefined;
}
