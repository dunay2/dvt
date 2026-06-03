/**
 * @file packages/@dvt/adapter-postgres/src/lineageOutboxStorePolicy.ts
 * @baseline ADR-0004: Event Sourcing Strategy
 * @baseline ADR-0031: Storage Adapter Tenant Isolation Strategy
 * @baseline ADR-0033: Outbox Worker Sharding And Fencing Model
 * @decision Normalize lineage outbox claim, tenant, and query bounds at the PostgreSQL adapter boundary
 * @consequence Lineage outbox reads remain bounded, tenant-scoped, and compatible with worker claim semantics
 * @version 0.1.0
 */
const DEFAULT_LINEAGE_OUTBOX_CLAIM_TIMEOUT_MS = 5 * 60 * 1000;
const MAX_LINEAGE_QUERY_LIMIT = 1000;

export function normalizeLineageOutboxClaimTimeoutMs(value: number | undefined): number {
  const claimTimeoutMs = value ?? DEFAULT_LINEAGE_OUTBOX_CLAIM_TIMEOUT_MS;
  if (!Number.isInteger(claimTimeoutMs) || claimTimeoutMs <= 0) {
    throw new Error(`INVALID_LINEAGE_OUTBOX_CLAIM_TIMEOUT_MS: ${value}`);
  }
  return claimTimeoutMs;
}

export function normalizeLineageTenantScope(tenantId: unknown): string {
  if (typeof tenantId !== 'string') {
    return '';
  }
  return tenantId.trim();
}

export function normalizeLineageQueryLimit(limit: number, fieldName: string): number {
  if (!Number.isInteger(limit) || !Number.isFinite(limit) || limit < 0) {
    throw new Error(`INVALID_${fieldName}: ${limit}`);
  }
  return Math.min(limit, MAX_LINEAGE_QUERY_LIMIT);
}
