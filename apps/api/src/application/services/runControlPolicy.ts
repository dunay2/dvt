/** Owned concern: derive run-control decisions from canonical server-owned lifecycle truth. */
import type { CanonicalRunStatus } from '@dvt/contracts';

import type {
  CancelRunDisposition,
  RunControlAvailabilityDto,
  RunControlUnavailableReason,
} from '../ports/runtime.js';

export type CancelRunDecision =
  | Readonly<{ kind: 'dispatch'; disposition: 'requested' }>
  | Readonly<{
      kind: 'settled';
      disposition: Exclude<CancelRunDisposition, 'requested'>;
    }>
  | Readonly<{ kind: 'reject'; reason: RunControlUnavailableReason }>;

export type RecoverRunDecision =
  | Readonly<{ kind: 'dispatch' }>
  | Readonly<{ kind: 'reject'; reason: RunControlUnavailableReason }>;

export function decideCancelRun(status: CanonicalRunStatus): CancelRunDecision {
  if (status.status === 'CANCELLED') {
    return { kind: 'settled', disposition: 'already_cancelled' };
  }
  if (status.substatus === 'CANCELLING') {
    return { kind: 'settled', disposition: 'already_requested' };
  }
  if (status.status === 'COMPLETED' || status.status === 'FAILED') {
    return { kind: 'reject', reason: 'run_terminal' };
  }
  return { kind: 'dispatch', disposition: 'requested' };
}

export function decideRecoverRun(status: CanonicalRunStatus): RecoverRunDecision {
  if (status.status === 'FAILED' || status.status === 'CANCELLED') {
    return { kind: 'dispatch' };
  }
  return {
    kind: 'reject',
    reason: status.status === 'COMPLETED' ? 'run_completed' : 'run_active',
  };
}

export function projectRunControlAvailability(
  status: CanonicalRunStatus,
  recoveryContextTrusted = true
): RunControlAvailabilityDto {
  const cancelDecision = decideCancelRun(status);
  const cancel: RunControlAvailabilityDto['cancel'] =
    cancelDecision.kind === 'dispatch'
      ? { available: true }
      : {
          available: false,
          reason:
            cancelDecision.kind === 'reject'
              ? cancelDecision.reason
              : cancelDecision.disposition === 'already_requested'
                ? 'cancellation_pending'
                : 'run_cancelled',
        };

  const recoverDecision = decideRecoverRun(status);
  if (recoverDecision.kind === 'dispatch') {
    return {
      cancel,
      recover: recoveryContextTrusted
        ? { available: true }
        : { available: false, reason: 'source_context_untrusted' },
    };
  }

  return {
    cancel,
    recover: {
      available: false,
      reason: recoverDecision.reason,
    },
  };
}
