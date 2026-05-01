/**
 * @file packages/@dvt/adapter-temporal/src/workflows/workflowControlSignalRetentionPolicy.ts
 * @ownedConcern Bounded retention policy for control-signal dedupe ids across workflow continuation
 * @baseline ADR-0003: Execution Model
 * @baseline ADR-0008: Signal Idempotency
 * @baseline ADR-0047: Runtime-Owned Realized Lifecycle For Signal-Driven Transitions
 * @decision Keep recent control-signal ids in continue-as-new cursor state without making cursor size unbounded
 * @consequence Long-running workflows retain practical dedupe protection while payload growth remains bounded
 * @version 1.0.0
 */

export const MAX_RETAINED_CONTROL_SIGNAL_IDS = 256;

export function retainRecentControlSignalIds(
  processedControlSignalIds: ReadonlySet<string>
): string[] {
  const ids = [...processedControlSignalIds];
  if (ids.length <= MAX_RETAINED_CONTROL_SIGNAL_IDS) {
    return ids;
  }

  return ids.slice(ids.length - MAX_RETAINED_CONTROL_SIGNAL_IDS);
}
