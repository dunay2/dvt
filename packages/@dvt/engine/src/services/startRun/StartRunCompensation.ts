/**
 * @baseline ADR-0030: Pre-Dispatch Intent Log for startRun Crash Consistency
 * @ownedConcern Record sticky compensation for the existing maintenance worker.
 * @decision Never equate requesting cancellation with observed termination.
 * @version 1.0.0
 */
import type { EngineRunRef } from '@dvt/contracts';

import type { StartRunTraceContext } from '../../core/lifecycle/StartRunTraceContext.js';
import { requireStartRunMutation } from '../../domain/startRunIntentPolicy.js';
import type { StartRunIntentClaimReceipt } from '../../ports/IStartRunIntentStore.js';

import type { StartRunFailureDiagnostics } from './StartRunFailureDiagnostics.js';

export class StartRunCompensation {
  constructor(
    private readonly deps: {
      intentStore: Pick<
        import('../../ports/IStartRunIntentStore.js').IStartRunIntentStore,
        'recordReconciliation'
      >;
      diagnostics: Pick<StartRunFailureDiagnostics, 'compensationFailed'>;
    }
  ) {}

  async compensate(input: {
    runRef: EngineRunRef;
    receipt: StartRunIntentClaimReceipt;
    traceContext: StartRunTraceContext;
    reason: 'bootstrap' | 'provider_ref_reconciliation';
  }): Promise<void> {
    try {
      requireStartRunMutation(
        await this.deps.intentStore.recordReconciliation(input.receipt, {
          kind: 'require_compensation',
          reason: input.reason === 'bootstrap' ? 'bootstrap_failed' : 'provider_ref_failed',
        })
      );
    } catch (error) {
      this.deps.diagnostics.compensationFailed(
        error,
        input.reason,
        input.runRef,
        input.traceContext
      );
    }
  }
}
