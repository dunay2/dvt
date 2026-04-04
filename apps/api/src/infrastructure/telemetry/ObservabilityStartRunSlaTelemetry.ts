import type { IObservability } from '@dvt/observability';

import type {
  IPlanCompileLatencyTelemetry,
  IStartRunLatencyTelemetry,
  PlanCompileLatencyOutcome,
  StartRunLatencyOutcome,
} from '../../application/ports/StartRunSlaTelemetry.js';
import { safeWarn } from '../admissionTelemetry/safeWarn.js';

import { START_RUN_SLA_METRICS } from './startRunSlaMetrics.js';

export class ObservabilityStartRunSlaTelemetry
  implements IStartRunLatencyTelemetry, IPlanCompileLatencyTelemetry
{
  private readonly runStartLatencyHistogram;
  private readonly planCompileLatencyHistogram;

  public constructor(
    private readonly deps: {
      readonly observability: IObservability;
    }
  ) {
    this.runStartLatencyHistogram = deps.observability.metrics.histogram(
      START_RUN_SLA_METRICS.runStartLatencyMs
    );
    this.planCompileLatencyHistogram = deps.observability.metrics.histogram(
      START_RUN_SLA_METRICS.planCompileLatencyMs
    );
  }

  public recordStartRunLatency(durationMs: number, outcome: StartRunLatencyOutcome): void {
    try {
      this.runStartLatencyHistogram.record(durationMs, { outcome });
    } catch (err) {
      safeWarn(this.deps.observability.logs, 'start_run.sla_telemetry_drop', err);
    }
  }

  public recordPlanCompileLatency(durationMs: number, outcome: PlanCompileLatencyOutcome): void {
    try {
      this.planCompileLatencyHistogram.record(durationMs, { outcome });
    } catch (err) {
      safeWarn(this.deps.observability.logs, 'start_run.sla_telemetry_drop', err);
    }
  }
}

