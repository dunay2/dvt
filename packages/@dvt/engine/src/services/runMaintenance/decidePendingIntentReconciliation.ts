/** @ownedConcern Select the existing pending-intent transition from explicit observations, without I/O. */
import type { CanonicalRunStatus, EngineRunRef } from '@dvt/contracts';

export type PendingIntentObservation =
  | {
      readonly kind: 'metadata_failed' | 'lookup_failed' | 'status_failed';
      readonly error: unknown;
    }
  | { readonly kind: 'lookup_unsupported'; readonly hasBootstrappedRun: boolean }
  | {
      readonly kind: 'workflow_found';
      readonly hasBootstrappedRun: boolean;
      readonly runRef: EngineRunRef;
    }
  | { readonly kind: 'workflow_missing'; readonly status: CanonicalRunStatus['status'] | null };

export type PendingIntentDecision =
  | {
      readonly kind: 'defer';
      readonly observation: Exclude<
        PendingIntentObservation,
        { kind: 'workflow_found' | 'workflow_missing' }
      >;
    }
  | { readonly kind: 'adopt' | 'cancel'; readonly runRef: EngineRunRef }
  | { readonly kind: 'expire_missing' }
  | { readonly kind: 'expire_terminal'; readonly status: CanonicalRunStatus['status'] }
  | { readonly kind: 'ready_to_dispatch' };

export function decidePendingIntentReconciliation(
  observation: PendingIntentObservation
): PendingIntentDecision {
  switch (observation.kind) {
    case 'metadata_failed':
    case 'lookup_failed':
    case 'status_failed':
    case 'lookup_unsupported':
      return { kind: 'defer', observation };
    case 'workflow_found':
      return {
        kind: observation.hasBootstrappedRun ? 'adopt' : 'cancel',
        runRef: observation.runRef,
      };
    case 'workflow_missing':
      if (observation.status === null) return { kind: 'expire_missing' };
      if (
        observation.status === 'COMPLETED' ||
        observation.status === 'FAILED' ||
        observation.status === 'CANCELLED'
      ) {
        return { kind: 'expire_terminal', status: observation.status };
      }
      return { kind: 'ready_to_dispatch' };
  }
}
