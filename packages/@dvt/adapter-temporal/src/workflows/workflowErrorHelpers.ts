/**
 * @file packages/@dvt/adapter-temporal/src/workflows/workflowErrorHelpers.ts
 * @baseline ADR-0001: Temporal Integration Test Policy
 * @baseline ADR-0003: Execution Model
 * @decision Normalize workflow-side unknown errors before they become canonical failure event payloads
 * @consequence Replay-safe error serialization stays deterministic across provider executions
 * @version 1.2.0
 */
export function formatUnknownError(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }

  if (error === null || error === undefined) {
    return 'Unknown error';
  }

  try {
    const json = JSON.stringify(error);
    return json ?? 'Unknown error';
  } catch {
    return 'Unknown error';
  }
}
