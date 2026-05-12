/**
 * @ownedConcern Emit non-blocking start-run telemetry for start and success.
 * @baseline ADR-0003: Execution Model Sovereignty
 * @baseline ADR-0014: Run-Driven Adapter Model
 * @decision Keep start-run start and success telemetry in a policy seam instead of the application coordinator.
 * @version 1.0.0
 */
import type { EngineRunRef, PlanRef, ResolvedRunContext } from '@dvt/contracts';
import type { IObservability } from '@dvt/observability';

import type { StartRunTraceContext } from '../../core/lifecycle/StartRunTraceContext.js';
import type { IClock } from '../../utils/clock.js';

import { START_RUN_MESSAGE } from './StartRunDomainConstants.js';

export interface StartRunTelemetryPolicyDeps {
  observability: IObservability;
  clock: Pick<IClock, 'nowIsoUtc'>;
}

export interface StartRunTelemetrySuccessInput {
  resolvedContext: ResolvedRunContext;
  startedAtMs: number;
}

export class StartRunTelemetryPolicy {
  constructor(private readonly deps: StartRunTelemetryPolicyDeps) {}

  nowMs(): number {
    return Date.parse(this.deps.clock.nowIsoUtc());
  }

  buildMetricTags(
    provider: EngineRunRef['provider'],
    tenantId: string,
    extras?: Record<string, string>
  ): Record<string, string> {
    return extras ? { provider, tenantId, ...extras } : { provider, tenantId };
  }

  recordStart(
    planRef: PlanRef,
    resolvedContext: ResolvedRunContext,
    traceContext: StartRunTraceContext
  ): void {
    try {
      this.deps.observability.logs.info({
        msg: START_RUN_MESSAGE.startingRun,
        context: traceContext,
        attributes: {
          provider: resolvedContext.targetAdapter,
          planUri: planRef.uri,
        },
      });
    } catch {
      // no-op: observability reporting must not fail startRun.
    }
  }

  recordStarted(input: StartRunTelemetrySuccessInput): void {
    const metricTags = this.buildMetricTags(
      input.resolvedContext.targetAdapter,
      input.resolvedContext.tenantId,
      { operation: 'startRun' }
    );
    try {
      this.deps.observability.metrics.counter('dvt.run.started_total', metricTags).add(1);
      this.deps.observability.metrics
        .histogram('dvt.run.start.duration_ms', metricTags)
        .record(this.nowMs() - input.startedAtMs);
    } catch {
      // no-op: observability reporting must not fail startRun.
    }
  }
}
