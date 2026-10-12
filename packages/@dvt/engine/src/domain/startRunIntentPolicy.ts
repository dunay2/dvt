/**
 * @file packages/@dvt/engine/src/domain/startRunIntentPolicy.ts
 * @baseline ADR-0030: Pre-Dispatch Intent Log for startRun Crash Consistency
 * @decision Canonical transition policy for start-run intent lifecycle
 * @consequence Transition guards remain consistent across in-memory and persistent stores
 * @version 1.0.0
 * @date 2026-03-05
 */
import type { EngineRunRef } from '@dvt/contracts';

import type {
  StartRunIntent,
  StartRunIntentStatus,
  StartRunIntentTransitionTarget,
  StartRunIntentMutationResult,
  ProviderStartOutcome,
} from '../ports/IStartRunIntentStore.js';

import { decideStartRunReconciliationCommand } from './startRunReconciliationPolicy.js';

const TRANSITION_RULES: Record<StartRunIntentTransitionTarget, readonly StartRunIntentStatus[]> = {
  DISPATCHED: ['PENDING'],
  RESOLVED: ['DISPATCHED'],
  EXPIRED: ['PENDING'],
};

export function isActiveStartRunIntent(status: StartRunIntentStatus): boolean {
  return status === 'PENDING' || status === 'DISPATCHED';
}

export function getAllowedFromStatuses(
  toStatus: StartRunIntentTransitionTarget
): readonly StartRunIntentStatus[] {
  return TRANSITION_RULES[toStatus];
}

export function canTransitionStartRunIntent(
  fromStatus: StartRunIntentStatus,
  toStatus: StartRunIntentTransitionTarget
): boolean {
  return getAllowedFromStatuses(toStatus).includes(fromStatus);
}

export type { StartRunIntentTransitionTarget };

/** Pure transition decision; the repository must hold and verify acquisition authority first. */
export function decideStartRunIntentTransition(
  intent: StartRunIntent,
  target: StartRunIntentTransitionTarget,
  runRef?: EngineRunRef
): StartRunIntentMutationResult {
  if (intent.compensation.kind === 'required' || intent.reconciliation.kind === 'escalated')
    return 'invalid_state';
  if (runRef && (runRef.tenantId !== intent.tenantId || runRef.provider !== intent.provider))
    return 'conflict';
  if (target === 'DISPATCHED' && (intent.status === 'DISPATCHED' || intent.status === 'RESOLVED'))
    return sameRunRef(
      intent.providerOutcome.kind === 'started' ? intent.providerOutcome.runRef : undefined,
      runRef
    )
      ? 'already_applied'
      : 'conflict';
  if (intent.status === target) return 'already_applied';
  if (target === 'DISPATCHED' && intent.providerOutcome.kind !== 'unknown') return 'invalid_state';
  if ((target === 'EXPIRED' || target === 'RESOLVED') && intent.providerOutcome.kind === 'unknown')
    return 'invalid_state';
  return canTransitionStartRunIntent(intent.status, target) ? 'applied' : 'invalid_state';
}

export type StartRunIntentCommand =
  | { kind: 'authorize_dispatch' }
  | { kind: 'reconcile'; command: import('../ports/IStartRunIntentStore.js').ReconciliationCommand }
  | { kind: 'transition'; target: StartRunIntentTransitionTarget; runRef?: EngineRunRef };

export type StartRunIntentDecision =
  | {
      result: 'applied';
      status: StartRunIntentStatus;
      providerOutcome: ProviderStartOutcome;
      compensation: StartRunIntent['compensation'];
      reconciliation: StartRunIntent['reconciliation'];
    }
  | { result: Exclude<StartRunIntentMutationResult, 'applied'> };

export function decideStartRunIntentCommand(
  intent: StartRunIntent,
  command: StartRunIntentCommand,
  now: string
): StartRunIntentDecision {
  if (command.kind === 'reconcile') {
    const decision = decideStartRunReconciliationCommand(intent, command.command, now);
    return decision.result === 'applied'
      ? { ...decision, providerOutcome: intent.providerOutcome }
      : decision;
  }
  if (command.kind === 'authorize_dispatch') {
    if (
      intent.status !== 'PENDING' ||
      intent.reconciliation.kind === 'escalated' ||
      intent.compensation.kind !== 'not_required'
    )
      return { result: 'invalid_state' };
    if (intent.providerOutcome.kind !== 'not_requested') return { result: 'already_applied' };
    return {
      result: 'applied',
      status: intent.status,
      compensation: intent.compensation,
      reconciliation: intent.reconciliation,
      providerOutcome: { kind: 'unknown', reasonCode: 'start_requested', since: now },
    };
  }
  const result = decideStartRunIntentTransition(intent, command.target, command.runRef);
  if (result !== 'applied') return { result };
  if (command.target === 'DISPATCHED' && command.runRef === undefined)
    return { result: 'conflict' };
  return {
    result,
    status: command.target,
    compensation: intent.compensation,
    reconciliation: intent.reconciliation,
    providerOutcome:
      command.runRef === undefined
        ? intent.providerOutcome
        : { kind: 'started', runRef: command.runRef },
  };
}

function sameRunRef(left: EngineRunRef | undefined, right: EngineRunRef | undefined): boolean {
  return (
    left !== undefined &&
    right !== undefined &&
    left.provider === right.provider &&
    left.tenantId === right.tenantId &&
    left.workflowId === right.workflowId &&
    left.runId === right.runId &&
    left.namespace === right.namespace &&
    left.taskQueue === right.taskQueue
  );
}

/** A rejected write conveys only its bounded reason, never acquisition secrets. */
export class StartRunIntentMutationRejectedError extends Error {
  constructor(
    readonly outcome: Exclude<StartRunIntentMutationResult, 'applied' | 'already_applied'>
  ) {
    super(`START_RUN_INTENT_MUTATION_REJECTED:${outcome}`);
    this.name = 'StartRunIntentMutationRejectedError';
  }
}

export function requireStartRunMutation(result: StartRunIntentMutationResult): void {
  if (result !== 'applied' && result !== 'already_applied')
    throw new StartRunIntentMutationRejectedError(result);
}
