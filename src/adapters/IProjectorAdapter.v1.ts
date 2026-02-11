/**
 * IProjectorAdapter.v1
 *
 * Normative contract for event projection and state materialization.
 *
 * Role: Transform workflow execution events into queryable materialized state.
 * Context: Used by operational dashboards, reporting systems, and state machines.
 *
 * Invariants:
 * - Idempotent: Same event processed multiple times produces same state
 * - Ordered: Events applied in causality order
 * - Complete: All events for a workflow are available for projection
 * - Durable: Projected state survives failures
 * - Searchable: Supports querying projected state by workflow/step/status
 */

import { TenantId, RunId, StepId, EventId } from './../../contracts/types'

/**
 * Projected state resulting from event processing.
 *
 * Examples:
 * - WorkflowSnapshot: Current state of all steps
 * - TaskMetrics: Aggregated timing and success rates
 * - AuditLog: Immutable record of all mutations
 */
export interface ProjectedState {
  tenantId: TenantId
  runId: RunId
  eventId: EventId
  projectedAt: number // Timestamp when projection occurred
  data: Record<string, unknown> // Adapter-specific materialized state
}

/**
 * Event that needs to be projected into materialized state.
 */
export interface ProjectionEvent {
  eventId: EventId
  tenantId: TenantId
  runId: RunId
  stepId?: StepId
  eventType: string
  eventData: Record<string, unknown>
  sequence: number // Global event order for causality
  occurredAt: number
}

/**
 * Query parameters for retrieving projected state.
 *
 * Supports filtering by:
 * - Tenant + Run (workflow-level state)
 * - Tenant + Run + Step (step-level state)
 * - Custom fields in projectedState.data
 */
export interface ProjectionQuery {
  tenantId: TenantId
  runId?: RunId
  stepId?: StepId
  filter?: Record<string, unknown>
  limit?: number
  offset?: number
}

/**
 * IProjectorAdapter - Normative contract for event projection.
 *
 * This adapter is responsible for:
 * 1. Processing events in sequence
 * 2. Maintaining consistency with source events
 * 3. Providing efficient query access to projected state
 * 4. Supporting rebuild from event log
 */
export interface IProjectorAdapter {
  /**
   * Project (apply) an event to produce or update materialized state.
   *
   * @param event - The event to project
   * @returns Updated projected state
   *
   * Contract:
   * - If event already processed (idempotent check), return without error
   * - Must apply events in sequence order
   * - Must preserve all event data for audit
   * - Must be atomic: either fully applied or not at all
   *
   * Example:
   * adapter.projectEvent({
   *   eventId: 'evt-001',
   *   runId: 'run-001',
   *   eventType: 'step_completed',
   *   sequence: 5,
   *   ...
   * })
   */
  projectEvent(event: ProjectionEvent): Promise<ProjectedState>

  /**
   * Project multiple events in batch (efficiently).
   *
   * @param events - Events in sequence order
   * @returns List of final state after each event
   *
   * Contract:
   * - Must process in order provided
   * - Must apply all or none (atomicity per batch)
   * - More efficient than individual projectEvent calls
   */
  projectBatch(events: ProjectionEvent[]): Promise<ProjectedState[]>

  /**
   * Query projected state.
   *
   * @param query - Filtering and pagination parameters
   * @returns List of matching projected states
   *
   * Contract:
   * - Must support filtering by tenantId, runId, stepId
   * - Must support pagination (limit/offset)
   * - Must be eventually consistent (read after write)
   * - Must handle missing runs gracefully (empty result)
   *
   * Example:
   * const states = await adapter.queryProjectedState({
   *   tenantId: 'tenant-001',
   *   runId: 'run-001',
   *   limit: 100
   * })
   */
  queryProjectedState(query: ProjectionQuery): Promise<ProjectedState[]>

  /**
   * Get current projected state for a single workflow run.
   *
   * @param tenantId - Tenant identifier
   * @param runId - Workflow run identifier
   * @returns Latest projected state, or undefined if not found
   *
   * Contract:
   * - Must return most recent projected state
   * - Must return undefined if workflow run not found
   * - Should be fast (cached if possible)
   */
  getWorkflowStateSnapshot(tenantId: TenantId, runId: RunId): Promise<ProjectedState | undefined>

  /**
   * Rebuild projected state from event log (e.g., after corruption).
   *
   * @param tenantId - Tenant identifier
   * @param runId - Workflow run identifier
   * @param events - Complete event sequence (should be ordered by sequence number)
   *
   * Contract:
   * - Must clear existing state first (or use upsert)
   * - Must apply all events in sequence order
   * - Must be idempotent (can be called multiple times)
   * - Should emit progress/completion event after rebuild
   */
  rebuildProjection(
    tenantId: TenantId,
    runId: RunId,
    events: ProjectionEvent[]
  ): Promise<ProjectedState>

  /**
   * Clear projected state (e.g., for test cleanup or archival).
   *
   * @param tenantId - Tenant identifier
   * @param runId - Workflow run identifier
   *
   * Contract:
   * - Must delete all projected state for this workflow
   * - Must be idempotent (no error if doesn't exist)
   * - Should not delete event log itself (only projections)
   */
  clearProjection(tenantId: TenantId, runId: RunId): Promise<void>

  /**
   * Health check for projector availability.
   *
   * @returns { healthy: boolean, message?: string }
   *
   * Contract:
   * - Should return quickly
   * - Should verify write/read capability
   * - Message should explain any issues
   */
  health(): Promise<{ healthy: boolean; message?: string }>

  /**
   * Graceful shutdown.
   *
   * Contract:
   * - Must flush any pending writes
   * - Must release connections/resources
   * - Should timeout after reasonable duration
   */
  close(): Promise<void>
}

/**
 * Adapter-specific implementations can extend with:
 * - Custom query language (SQL, DynamoDB expressions, etc.)
 * - Materialization strategies (denormalization, etc.)
 * - Performance optimizations (materialized views, caching)
 */
