import { EnvironmentId, ProjectId, TenantId } from '../../domain/auth/types.js';

export function parseOptionalInt(raw: string | undefined): number | null | undefined {
  if (raw === undefined) return undefined;
  if (!/^\d+$/.test(raw.trim())) return null;
  const parsed = Number(raw);
  return Number.isInteger(parsed) ? parsed : null;
}

export function parseIntWithDefault(raw: string | undefined, defaultValue: number): number | null {
  if (raw === undefined) return defaultValue;
  const parsed = parseOptionalInt(raw);
  return parsed === undefined ? defaultValue : parsed;
}

export function normalizeRequiredString(raw: string | undefined): string | undefined {
  const normalized = raw?.trim();
  return normalized && normalized.length > 0 ? normalized : undefined;
}

export type RequiredTenantIdResult =
  | { readonly kind: 'ok'; readonly value: TenantId }
  | { readonly kind: 'missing' }
  | { readonly kind: 'invalid' };

export function parseRequiredTenantId(raw: string | undefined): RequiredTenantIdResult {
  if (raw === undefined) {
    return { kind: 'missing' };
  }

  const parsed = TenantId.parse(raw);
  if (!parsed.ok) {
    return { kind: 'invalid' };
  }

  return { kind: 'ok', value: parsed.value };
}

export type OptionalProjectIdResult =
  | { readonly kind: 'ok'; readonly value: ProjectId | undefined }
  | { readonly kind: 'invalid' };

export function parseOptionalProjectId(raw: string | undefined): OptionalProjectIdResult {
  if (raw === undefined) {
    return { kind: 'ok', value: undefined };
  }

  const parsed = ProjectId.parse(raw);
  if (!parsed.ok) {
    return { kind: 'invalid' };
  }

  return { kind: 'ok', value: parsed.value };
}

export type OptionalEnvironmentIdResult =
  | { readonly kind: 'ok'; readonly value: EnvironmentId | undefined }
  | { readonly kind: 'invalid' };

export function parseOptionalEnvironmentId(raw: string | undefined): OptionalEnvironmentIdResult {
  if (raw === undefined) {
    return { kind: 'ok', value: undefined };
  }

  const parsed = EnvironmentId.parse(raw);
  if (!parsed.ok) {
    return { kind: 'invalid' };
  }

  return { kind: 'ok', value: parsed.value };
}

export function parseBooleanQuery(raw: string | undefined): { readonly ok: true; readonly value: boolean } | { readonly ok: false } {
  if (raw === undefined) return { ok: true, value: false };
  const normalized = raw.trim().toLowerCase();
  if (normalized === 'true') return { ok: true, value: true };
  if (normalized === 'false') return { ok: true, value: false };
  return { ok: false };
}
