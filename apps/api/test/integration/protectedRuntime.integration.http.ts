/**
 * @file apps/api/test/integration/protectedRuntime.integration.http.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @baseline ADR-0004: Event Sourcing Strategy
 * @decision Keep protected-runtime response-shape helpers separate from runtime bootstrap
 * @date 2026-04-18
 */
export function httpError(
  type: string,
  reason: string,
  extra?: { target?: string; details?: Record<string, unknown> }
): { error: { type: string; reason: string; target?: string; details?: Record<string, unknown> } } {
  return {
    error: {
      type,
      reason,
      ...(extra?.target === undefined ? {} : { target: extra.target }),
      ...(extra?.details === undefined ? {} : { details: extra.details }),
    },
  };
}

export function eventTypes(payload: unknown): string[] {
  if (payload === null || typeof payload !== 'object') {
    return [];
  }

  const items = (payload as { items?: unknown }).items;
  if (Array.isArray(items) === false) {
    return [];
  }

  return items
    .map((item) => item.eventType)
    .filter((value): value is string => typeof value === 'string');
}
