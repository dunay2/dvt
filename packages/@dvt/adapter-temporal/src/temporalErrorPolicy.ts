/**
 * @file packages/@dvt/adapter-temporal/src/temporalErrorPolicy.ts
 *
 * Centralized Temporal error classification policy.
 *
 * Extracted from TemporalAdapter so all adapter methods share a single,
 * tested source of truth for "workflow not found" detection. Previously
 * these functions lived as private module-scope helpers inside TemporalAdapter,
 * meaning any new adapter method (cancelRun, queryRun, etc.) would have to
 * duplicate or inline the same logic.
 */

/**
 * Detects "workflow not found" responses from the Temporal server.
 *
 * The Temporal TypeScript SDK throws WorkflowNotFoundError when describe() is
 * called on a non-existent workflow. Older SDK versions may surface a
 * ServiceError with gRPC status NOT_FOUND (code 5). Both are treated as "not
 * found" so the adapter stays robust across SDK patch versions.
 */
export function isWorkflowNotFound(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error.name === 'WorkflowNotFoundError') return true;
  const asRecord = error as unknown as Record<string, unknown>;
  if (error.name !== 'ServiceError') return false;
  const normalizedCode = normalizeTemporalErrorCode(asRecord['code']);
  return normalizedCode === '5' || normalizedCode === 'NOT_FOUND';
}

/**
 * Normalizes a Temporal gRPC error code to a canonical string form.
 *
 * Handles the SDK's inconsistency in surfacing error codes as either a number
 * (e.g. 5) or a string (e.g. "5", "NOT_FOUND", "not_found", " 5 ").
 * Returns undefined for any value that cannot be meaningfully normalized.
 */
export function normalizeTemporalErrorCode(code: unknown): string | undefined {
  if (typeof code === 'number') {
    return Number.isFinite(code) ? String(code) : undefined;
  }
  if (typeof code !== 'string') {
    return undefined;
  }
  const normalized = code.trim();
  if (normalized.length === 0) {
    return undefined;
  }
  return /^\d+$/.test(normalized) ? String(Number(normalized)) : normalized.toUpperCase();
}
