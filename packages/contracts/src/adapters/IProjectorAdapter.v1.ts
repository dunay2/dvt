import { TenantId, RunId, StepId, EventId } from '../types/contracts';

export interface ProjectedState {
  tenantId: TenantId;
  runId: RunId;
  eventId: EventId;
  projectedAt: number;
  data: Record<string, unknown>;
}

export interface ProjectionEvent {
  eventId: EventId;
  tenantId: TenantId;
  runId: RunId;
  stepId?: StepId;
  eventType: string;
  eventData: Record<string, unknown>;
  sequence: number;
  occurredAt: number;
}

export interface ProjectionQuery {
  tenantId: TenantId;
  runId?: RunId;
  stepId?: StepId;
  filter?: Record<string, unknown>;
  limit?: number;
  offset?: number;
}

export interface IProjectorAdapter {
  projectEvent(event: ProjectionEvent): Promise<ProjectedState>;
  projectBatch(events: ProjectionEvent[]): Promise<ProjectedState[]>;
  queryProjectedState(query: ProjectionQuery): Promise<ProjectedState[]>;
  getWorkflowStateSnapshot(tenantId: TenantId, runId: RunId): Promise<ProjectedState | undefined>;
  rebuildProjection(
    tenantId: TenantId,
    runId: RunId,
    events: ProjectionEvent[]
  ): Promise<ProjectedState>;
  clearProjection(tenantId: TenantId, runId: RunId): Promise<void>;
  health(): Promise<{ healthy: boolean; message?: string }>;
  close(): Promise<void>;
}
