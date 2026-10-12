/**
 * @baseline ADR-0030: Durable reconciliation and confirmed compensation
 * @ownedConcern Pure compensation and bounded retry transitions within the start intent aggregate.
 * @decision Preserve compensation until terminal confirmation and bound retries with durable escalation.
 * @version 1.0.0
 */
import { epochMsToIsoUtc } from '@dvt/contracts';

import type {
  ReconciliationCommand,
  StartRunIntent,
  StartRunIntentMutationResult,
  StartRunReconciliationReason,
  StartRunReconciliationState,
} from '../ports/IStartRunIntentStore.js';

export const RECONCILIATION_BACKOFF_MS = [30_000, 60_000, 120_000, 240_000, 300_000] as const;
export const RECONCILIATION_MAX_ATTEMPTS = 8;
export type ReconciliationDecision =
  | {
      result: 'applied';
      status: StartRunIntent['status'];
      compensation: StartRunIntent['compensation'];
      reconciliation: StartRunReconciliationState;
    }
  | { result: Exclude<StartRunIntentMutationResult, 'applied'> };

export function nextReconciliationAttempt(
  intent: StartRunIntent,
  reason: StartRunReconciliationReason,
  now: string
): StartRunReconciliationState {
  const attempts = intent.reconciliation.attempts + 1;
  if (attempts >= RECONCILIATION_MAX_ATTEMPTS)
    return { kind: 'escalated', attempts, reason, since: now };
  const delay =
    RECONCILIATION_BACKOFF_MS[Math.min(attempts - 1, RECONCILIATION_BACKOFF_MS.length - 1)] ??
    300_000;
  return {
    kind: 'pending',
    attempts,
    reason,
    nextAttemptAt: epochMsToIsoUtc(Date.parse(now) + delay),
  };
}

export function decideStartRunReconciliationCommand(
  intent: StartRunIntent,
  command: ReconciliationCommand,
  now: string
): ReconciliationDecision {
  const applied = (
    changes: Partial<Pick<StartRunIntent, 'status' | 'compensation' | 'reconciliation'>>
  ): ReconciliationDecision => ({
    result: 'applied',
    status: intent.status,
    compensation: intent.compensation,
    reconciliation: intent.reconciliation,
    ...changes,
  });
  if (intent.status !== 'PENDING' && intent.status !== 'DISPATCHED') {
    return {
      result:
        command.kind === 'confirm_compensation' &&
        intent.compensation.kind === 'confirmed' &&
        intent.compensation.executionId === command.executionId &&
        intent.compensation.disposition === command.disposition
          ? 'already_applied'
          : 'invalid_state',
    };
  }
  if (intent.reconciliation.kind === 'escalated') return { result: 'invalid_state' };
  switch (command.kind) {
    case 'cancel_failed':
      if (intent.compensation.kind !== 'required' || intent.reconciliation.attempts === 0)
        return { result: 'invalid_state' };
      return applied({ reconciliation: { ...intent.reconciliation, reason: 'cancel_failed' } });
    case 'require_compensation':
      if (intent.providerOutcome.kind !== 'started') return { result: 'invalid_state' };
      if (intent.compensation.kind !== 'not_required') return { result: 'already_applied' };
      return applied({ compensation: { kind: 'required', reason: command.reason, since: now } });
    case 'authorize_cancel': {
      if (!command.executionId.trim() || intent.compensation.kind !== 'required')
        return { result: 'invalid_state' };
      if (
        intent.compensation.executionId !== undefined &&
        intent.compensation.executionId !== command.executionId
      )
        return { result: 'conflict' };
      const reconciliation = nextReconciliationAttempt(intent, 'cancel_requested', now);
      // The last attempt is observation/escalation only, never another side effect.
      if (reconciliation.kind === 'escalated') return { result: 'invalid_state' };
      return applied({
        compensation: { ...intent.compensation, executionId: command.executionId },
        reconciliation,
      });
    }
    case 'confirm_compensation':
      if (!command.executionId.trim() || intent.compensation.kind !== 'required')
        return { result: 'invalid_state' };
      if (
        intent.compensation.executionId !== undefined &&
        intent.compensation.executionId !== command.executionId
      )
        return { result: 'conflict' };
      return applied({
        status: 'RESOLVED',
        compensation: {
          kind: 'confirmed',
          executionId: command.executionId,
          disposition: command.disposition,
          confirmedAt: now,
        },
      });
    case 'defer':
      return applied({ reconciliation: nextReconciliationAttempt(intent, command.reason, now) });
    case 'escalate':
      return applied({
        reconciliation: {
          kind: 'escalated',
          attempts: intent.reconciliation.attempts,
          reason: command.reason,
          since: now,
          ...(command.observation === undefined ? {} : { observation: command.observation }),
        },
      });
  }
}
