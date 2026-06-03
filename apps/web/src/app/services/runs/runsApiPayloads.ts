import type { SessionContextPort } from '../../ports/sessionContext';

import { asFiniteInteger } from './runsApiDecoders';

/**
 * Owned concern: extract and shape API request payloads for runs, including
 * tenant-scoped query parameter construction.
 */
export function extractRunListPayload(payload: unknown): unknown[] {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const record = payload as { items?: unknown[] };
  return Array.isArray(record.items) ? record.items : [];
}

export function extractEventsPayload(payload: unknown): {
  events: unknown[];
  nextAfterSeq?: number;
} {
  if (!payload || typeof payload !== 'object') {
    return { events: [] };
  }

  const record = payload as { items?: unknown[]; nextCursor?: unknown };
  return {
    events: Array.isArray(record.items) ? record.items : [],
    nextAfterSeq: asFiniteInteger(record.nextCursor),
  };
}

export function buildTenantScopeQuery(
  sessionContext: SessionContextPort,
  includeWorkspaceScope: boolean
): string {
  const { tenantId, projectId, environmentId } = sessionContext.getWorkspaceScope();
  const query = new URLSearchParams({ tenantId });

  if (includeWorkspaceScope) {
    query.set('projectId', projectId);
    query.set('environmentId', environmentId);
  }

  return query.toString();
}
