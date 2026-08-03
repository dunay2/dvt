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

export interface RunControlAvailabilityEvidence {
  readonly recoveryContextTrusted?: boolean;
  readonly recoveryPlanAvailable?: boolean;
  readonly recoveryAdapterAvailable?: boolean;
  readonly cancelDispatchConfirmed?: boolean;
  readonly cancellationAccepted?: boolean;
}

export function decideCancelRun(
  status: CanonicalRunStatus,
  startDispatchConfirmed = false
): CancelRunDecision {
  if (status.status === 'PENDING' && !startDispatchConfirmed) {
    return { kind: 'reject', reason: 'dispatch_pending' };
  }
  if (status.status === 'CANCELLED') {
    return { kind: 'settled', disposition: 'already_cancelled' };
  }
  if (status.status === 'COMPLETED' || status.status === 'FAILED') {
    return { kind: 'reject', reason: 'run_terminal' };
  }
  if (status.substatus === 'CANCELLING') {
    return { kind: 'settled', disposition: 'already_requested' };
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
  evidence: RunControlAvailabilityEvidence = {}
): RunControlAvailabilityDto {
  const lifecycleCancelDecision = decideCancelRun(
    status,
    evidence.cancelDispatchConfirmed ?? false
  );
  const cancelDecision =
    evidence.cancellationAccepted && !isTerminalCancelDecision(lifecycleCancelDecision)
      ? ({ kind: 'settled', disposition: 'already_requested' } as const)
      : lifecycleCancelDecision;
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
      recover: !(evidence.recoveryAdapterAvailable ?? true)
        ? { available: false, reason: 'source_adapter_unavailable' }
        : !(evidence.recoveryPlanAvailable ?? true)
          ? { available: false, reason: 'source_plan_unavailable' }
          : (evidence.recoveryContextTrusted ?? true)
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

export function cancellationReceiptCanAffectAvailability(status: CanonicalRunStatus): boolean {
  return !isTerminalCancelDecision(decideCancelRun(status));
}

function isTerminalCancelDecision(decision: CancelRunDecision): boolean {
  return (
    (decision.kind === 'reject' && decision.reason === 'run_terminal') ||
    (decision.kind === 'settled' && decision.disposition === 'already_cancelled')
  );
}
