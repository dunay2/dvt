/**
 * @baseline ADR-0030: Unknown provider outcomes and sticky compensation
 * @ownedConcern Pure reconciliation decisions; no network, persistence or diagnostic transport.
 */
import type { CanonicalRunStatus, EngineRunRef } from '@dvt/contracts';
import { TERMINAL_RUN_STATUSES } from '@dvt/run-domain';

import type {
  ProviderExecutionTarget,
  ProviderRunObservation,
  ProviderTerminalDisposition,
} from '../../adapters/IProviderAdapter.js';
import { RECONCILIATION_MAX_ATTEMPTS } from '../../domain/startRunReconciliationPolicy.js';
import type {
  StartRunIntent,
  StartRunCompensationReason,
  StartRunReconciliationReason,
} from '../../ports/IStartRunIntentStore.js';

export type StartRunReconciliationObservation =
  | { kind: 'failed'; reason: StartRunReconciliationReason }
  | {
      kind: 'known';
      canonical: CanonicalRunStatus['status'] | null;
      provider: ProviderRunObservation;
    };
export type StartRunReconciliationDecision =
  | { kind: 'defer'; reason: StartRunReconciliationReason }
  | { kind: 'escalate'; reason: StartRunReconciliationReason; observation?: ProviderRunObservation }
  | { kind: 'expire' }
  | { kind: 'adopt' | 'resolve_terminal'; runRef: EngineRunRef }
  | { kind: 'cancel'; target: ProviderExecutionTarget; reason: StartRunCompensationReason }
  | { kind: 'confirm'; target: ProviderExecutionTarget; disposition: 'cancelled' | 'terminated' };

export function decideStartRunIntentReconciliation(
  intent: StartRunIntent,
  observation: StartRunReconciliationObservation
): StartRunReconciliationDecision {
  const defer = (reason: StartRunReconciliationReason): StartRunReconciliationDecision =>
    intent.reconciliation.attempts >= RECONCILIATION_MAX_ATTEMPTS - 1
      ? { kind: 'escalate', reason }
      : { kind: 'defer', reason };
  if (observation.kind === 'failed') return defer(observation.reason);
  const { canonical, provider } = observation;
  if (provider.kind === 'missing_at_observation') {
    return intent.providerOutcome.kind === 'not_requested'
      ? { kind: 'expire' }
      : defer('provider_missing');
  }
  const { target } = provider;
  if (
    intent.providerOutcome.kind === 'not_requested' ||
    target.runRef.tenantId !== intent.tenantId ||
    target.runRef.runId !== intent.runId ||
    target.runRef.provider !== intent.provider ||
    (intent.providerOutcome.kind === 'started' &&
      (intent.providerOutcome.runRef.workflowId !== target.runRef.workflowId ||
        intent.providerOutcome.runRef.namespace !== target.runRef.namespace)) ||
    (intent.compensation.kind === 'required' &&
      intent.compensation.executionId !== undefined &&
      intent.compensation.executionId !== target.executionId)
  ) {
    return { kind: 'escalate', reason: 'execution_changed', observation: provider };
  }
  if (provider.kind === 'terminal') {
    if (provider.disposition === 'cancelled' || provider.disposition === 'terminated') {
      if (
        intent.compensation.kind === 'required' ||
        canonical === null ||
        !compatibleTerminal(canonical, provider.disposition)
      ) {
        return { kind: 'confirm', target, disposition: provider.disposition };
      }
    }
    if (
      intent.compensation.kind === 'not_required' &&
      canonical !== null &&
      compatibleTerminal(canonical, provider.disposition)
    )
      return { kind: 'resolve_terminal', runRef: target.runRef };
    if (
      intent.compensation.kind === 'required' ||
      canonical === null ||
      TERMINAL_RUN_STATUSES.has(canonical)
    )
      return { kind: 'escalate', reason: 'terminal_orphan', observation: provider };
    return defer('canonical_not_terminal');
  }
  const reason =
    intent.compensation.kind === 'required'
      ? intent.compensation.reason
      : canonical === null
        ? 'orphaned_provider'
        : 'terminal_canonical';
  if (
    intent.compensation.kind === 'required' ||
    canonical === null ||
    TERMINAL_RUN_STATUSES.has(canonical)
  ) {
    return intent.reconciliation.attempts >= RECONCILIATION_MAX_ATTEMPTS - 1
      ? { kind: 'escalate', reason: 'cancel_requested', observation: provider }
      : { kind: 'cancel', target, reason };
  }
  return { kind: 'adopt', runRef: target.runRef };
}

function compatibleTerminal(
  canonical: CanonicalRunStatus['status'],
  disposition: ProviderTerminalDisposition
): boolean {
  return (
    (canonical === 'COMPLETED' && disposition === 'completed') ||
    (canonical === 'FAILED' && (disposition === 'failed' || disposition === 'timed_out')) ||
    (canonical === 'CANCELLED' && (disposition === 'cancelled' || disposition === 'terminated'))
  );
}
