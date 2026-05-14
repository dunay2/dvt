/**
 * Owned concern: convert wall-clock millisecond deltas into AR-C2 SLA seconds.
 */
export function elapsedSlaSecondsSince(startedAtMs: number, nowMs = Date.now()): number {
  return (nowMs - startedAtMs) / 1000;
}
