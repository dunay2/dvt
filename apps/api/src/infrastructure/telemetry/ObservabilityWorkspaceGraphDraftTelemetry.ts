import type { IObservability } from '@dvt/observability';

import type {
  IWorkspaceGraphDraftTelemetry,
  WorkspaceGraphDraftReadTelemetryOutcome,
  WorkspaceGraphDraftWriteTelemetryOutcome,
} from '../../application/ports/workspaceGraphDraft.js';
import { safeWarn } from '../admissionTelemetry/safeWarn.js';

const WORKSPACE_GRAPH_DRAFT_METRICS = {
  readTotal: 'dvt.api.workspace_graph_draft.read_total',
  readLatencyMs: 'dvt.api.workspace_graph_draft.read_latency_ms',
  writeTotal: 'dvt.api.workspace_graph_draft.write_total',
  writeLatencyMs: 'dvt.api.workspace_graph_draft.write_latency_ms',
} as const;

export class ObservabilityWorkspaceGraphDraftTelemetry implements IWorkspaceGraphDraftTelemetry {
  private readonly readCounter;
  private readonly readLatency;
  private readonly writeCounter;
  private readonly writeLatency;

  public constructor(
    private readonly deps: {
      readonly observability: IObservability;
    }
  ) {
    this.readCounter = deps.observability.metrics.counter(WORKSPACE_GRAPH_DRAFT_METRICS.readTotal);
    this.readLatency = deps.observability.metrics.histogram(
      WORKSPACE_GRAPH_DRAFT_METRICS.readLatencyMs
    );
    this.writeCounter = deps.observability.metrics.counter(WORKSPACE_GRAPH_DRAFT_METRICS.writeTotal);
    this.writeLatency = deps.observability.metrics.histogram(
      WORKSPACE_GRAPH_DRAFT_METRICS.writeLatencyMs
    );
  }

  public recordRead(
    outcome: WorkspaceGraphDraftReadTelemetryOutcome,
    mode: string,
    latencyMs: number
  ): void {
    try {
      this.readCounter.add(1, { outcome, mode });
      this.readLatency.record(latencyMs, { outcome, mode });
    } catch (error) {
      safeWarn(
        this.deps.observability.logs,
        'workspace_graph_draft.read_telemetry_drop',
        error
      );
    }
  }

  public recordWrite(
    outcome: WorkspaceGraphDraftWriteTelemetryOutcome,
    mode: string,
    latencyMs: number
  ): void {
    try {
      this.writeCounter.add(1, { outcome, mode });
      this.writeLatency.record(latencyMs, { outcome, mode });
    } catch (error) {
      safeWarn(
        this.deps.observability.logs,
        'workspace_graph_draft.write_telemetry_drop',
        error
      );
    }
  }
}
