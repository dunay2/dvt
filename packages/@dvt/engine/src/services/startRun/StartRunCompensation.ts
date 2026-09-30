/**
 * @baseline ADR-0030: Pre-Dispatch Intent Log for startRun Crash Consistency
 * @ownedConcern Execute the existing cancellation then intent-cleanup compensation sequence.
 * @decision Keep compensation sequencing in one owner without claiming confirmed termination.
 * @version 1.0.0
 */
import type { EngineRunRef } from '@dvt/contracts';

import type { IProviderAdapter } from '../../adapters/IProviderAdapter.js';
import type { StartRunTraceContext } from '../../core/lifecycle/StartRunTraceContext.js';

import type { StartRunFailureDiagnostics } from './StartRunFailureDiagnostics.js';
import type { IStartRunFailurePolicy } from './StartRunTypes.js';

export class StartRunCompensation {
  constructor(
    private readonly deps: {
      failurePolicy: Pick<IStartRunFailurePolicy, 'markIntentResolvedBestEffort'>;
      diagnostics: Pick<StartRunFailureDiagnostics, 'compensationFailed'>;
    }
  ) {}

  async compensate(input: {
    adapter: Pick<IProviderAdapter, 'cancelRun'>;
    runRef: EngineRunRef;
    intentId: string;
    tenantId: string;
    runId: string;
    traceContext: StartRunTraceContext;
    reason: 'bootstrap' | 'provider_ref_reconciliation';
  }): Promise<void> {
    try {
      await input.adapter.cancelRun(input.runRef);
    } catch (error) {
      this.deps.diagnostics.compensationFailed(
        error,
        input.reason,
        input.runRef,
        input.traceContext
      );
    }
    // Preserves the current protocol; cancellation confirmation is owned by #2679.
    await this.deps.failurePolicy.markIntentResolvedBestEffort({
      intentId: input.intentId,
      tenantId: input.tenantId,
      runId: input.runId,
      provider: input.runRef.provider,
      traceContext: input.traceContext,
    });
  }
}
