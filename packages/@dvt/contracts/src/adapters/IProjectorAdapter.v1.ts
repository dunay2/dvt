/**
 * @file packages/@dvt/contracts/src/adapters/IProjectorAdapter.v1.ts
 * @baseline ADR-0004: Event Sourcing Strategy (Extended)
 * @baseline ADR-0005: Contract Formalization Tooling
 * @decision Section 2.2 — Projection adapter contract separates read-model projection concerns from write-side event log
 * @consequence Read-side rebuild/query semantics are standardized across projector implementations
 * @version 1.0.0
 * @date 2026-02-21
 */
import { TenantId, RunId, StepId, EventId } from '../types/contracts.js';

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
