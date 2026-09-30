/**
 * @baseline ADR-0030: Pre-Dispatch Intent Log for startRun Crash Consistency
 * @ownedConcern Report start failures without granting mutation authority or masking causal errors.
 * @decision Isolate fail-soft diagnostic transport from run and intent mutation decisions.
 * @version 1.0.0
 */
import type { EngineRunRef } from '@dvt/contracts';
import type { IObservability } from '@dvt/observability';

import type { StartRunTraceContext } from '../../core/lifecycle/StartRunTraceContext.js';
import type { IClock } from '../../utils/clock.js';
import { toErrorMessage } from '../../utils/errorUtils.js';

import {
  START_RUN_AUTHORITY_REASON,
  START_RUN_MESSAGE,
  START_RUN_METRIC,
} from './StartRunDomainConstants.js';
type ResolutionContext = {
  intentId: string;
  tenantId: string;
  runId: string;
  provider: EngineRunRef['provider'];
  traceContext: StartRunTraceContext;
};
type DiagnosticDeps = {
  observability: IObservability;
  clock: IClock;
  observabilityFallbackThrottleMs?: number;
};

export class StartRunFailureDiagnostics {
  private readonly stderrFallbackThrottleMs: number;
  private lastStderrFallbackAtMs = 0;

  constructor(private readonly deps: DiagnosticDeps) {
    const throttle = deps.observabilityFallbackThrottleMs;
    this.stderrFallbackThrottleMs =
      typeof throttle === 'number' && Number.isFinite(throttle) && throttle > 0 ? throttle : 30_000;
  }

  markResolvedFailed(error: unknown, input: ResolutionContext): void {
    this.bestEffort(() =>
      this.deps.observability.metrics
        .counter(START_RUN_METRIC.intentMarkResolvedFailedTotal, {
          tenantId: input.tenantId,
          provider: input.provider,
          operation: 'markResolved',
        })
        .add(1)
    );
    try {
      this.deps.observability.logs.warn({
        msg: START_RUN_MESSAGE.markResolvedFailed,
        context: input.traceContext,
        attributes: {
          intentId: input.intentId,
          tenantId: input.tenantId,
          runId: input.runId,
          provider: input.provider,
          error: toErrorMessage(error),
        },
      });
    } catch {
      this.reportFallback(input);
    }
  }

  startFailed(
    error: unknown,
    provider: EngineRunRef['provider'],
    metricTags: Record<string, string>,
    context: StartRunTraceContext
  ): void {
    this.bestEffort(() =>
      this.deps.observability.metrics.counter(START_RUN_METRIC.startFailedTotal, metricTags).add(1)
    );
    this.bestEffort(() =>
      this.deps.observability.logs.error({
        msg: START_RUN_MESSAGE.startRunFailed,
        context,
        err: toErrorMessage(error),
        attributes: { provider, error: toErrorMessage(error) },
      })
    );
  }

  postStartPersistenceFailed(
    error: { intentId: string; runRef: EngineRunRef; originalError: unknown },
    context: StartRunTraceContext
  ): void {
    this.bestEffort(() =>
      this.deps.observability.logs.warn({
        msg: START_RUN_MESSAGE.postStartIntentPersistenceFailed,
        context,
        attributes: {
          intentId: error.intentId,
          runId: error.runRef.runId,
          provider: error.runRef.provider,
          error: toErrorMessage(error.originalError),
        },
      })
    );
  }

  pendingIntent(
    intent: { intentId: string; runId: string; provider: EngineRunRef['provider'] },
    context: StartRunTraceContext
  ): void {
    this.bestEffort(() =>
      this.deps.observability.logs.warn({
        msg: START_RUN_MESSAGE.skipRunFailedPendingIntent,
        context,
        attributes: { intentId: intent.intentId, runId: intent.runId, provider: intent.provider },
      })
    );
  }

  unavailableAuthority(
    reasonCode: (typeof START_RUN_AUTHORITY_REASON)[keyof typeof START_RUN_AUTHORITY_REASON],
    context: StartRunTraceContext
  ): void {
    this.bestEffort(() =>
      this.deps.observability.logs.warn({
        msg: START_RUN_MESSAGE.skipRunFailedUnavailableAuthority,
        context,
        attributes: { reasonCode },
      })
    );
  }

  runFailedEmissionFailed(error: unknown, context: StartRunTraceContext): void {
    this.bestEffort(() =>
      this.deps.observability.logs.error({
        msg: START_RUN_MESSAGE.runFailedEmissionFailed,
        context,
        err: toErrorMessage(error),
        attributes: { error: toErrorMessage(error) },
      })
    );
  }

  compensationFailed(
    error: unknown,
    reason: 'bootstrap' | 'provider_ref_reconciliation',
    runRef: EngineRunRef,
    context: StartRunTraceContext
  ): void {
    this.bestEffort(() =>
      this.deps.observability.logs.error({
        msg:
          reason === 'bootstrap'
            ? START_RUN_MESSAGE.compensationPersistenceFailed
            : START_RUN_MESSAGE.providerRefCompensationPersistenceFailed,
        context,
        err: error,
        attributes: {
          error: toErrorMessage(error),
          ...(reason === 'bootstrap' ? {} : { provider: runRef.provider }),
        },
      })
    );
  }

  providerRefReconciliationFailed(
    error: unknown,
    runId: string,
    estimatedRef: EngineRunRef,
    runRef: EngineRunRef,
    context: StartRunTraceContext
  ): void {
    this.bestEffort(() =>
      this.deps.observability.logs.error({
        msg: START_RUN_MESSAGE.providerRefReconciliationFailed,
        context,
        err: error,
        attributes: {
          runId,
          provider: runRef.provider,
          estimatedRunRef: JSON.stringify(estimatedRef),
          actualRunRef: JSON.stringify(runRef),
        },
      })
    );
  }

  private reportFallback(input: ResolutionContext): void {
    this.bestEffort(() => {
      const nowMs = Date.parse(this.deps.clock.nowIsoUtc());
      if (
        this.lastStderrFallbackAtMs === 0 ||
        nowMs - this.lastStderrFallbackAtMs >= this.stderrFallbackThrottleMs
      ) {
        this.lastStderrFallbackAtMs = nowMs;
        process.stderr.write(
          `${START_RUN_MESSAGE.markResolvedReportingFailed} intentId=${input.intentId} runId=${input.runId} tenantId=${input.tenantId}\n`
        );
      }
    });
  }

  private bestEffort(report: () => void): void {
    try {
      report();
    } catch {
      // Diagnostic sinks cannot change the protocol outcome or causal error.
    }
  }
}
