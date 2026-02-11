/**
 * State Store Contract Types (v1.0)
 *
 * TypeScript types for State Store adapters and operations
 * @see {@link /home/runner/work/dvt/dvt/docs/architecture/engine/contracts/state-store/README.md}
 * @see {@link /home/runner/work/dvt/dvt/docs/architecture/engine/contracts/engine/ExecutionSemantics.v1.md}
 */

import { AppendResult, OutboxEvent } from '../core/types';

import { ArtifactRef } from './artifacts';
import { RunStatus } from './contracts';

/**
 * Result of appending an event to the state store
 * Re-exported from core/types.ts for convenience
 * @see State Store Contract § 1 - Core Interface
 */
export type { AppendResult };

/**
 * Canonical engine event structure
 * All events persisted to StateStore must follow this structure
 * @see State Store Contract § 1 - Core Interface
 * @see ExecutionSemantics.v1.md § 1.2 - Append-Only Event Model
 */
export interface CanonicalEngineEvent {
  /** Run identifier */
  runId: string;
  /** Monotonic sequence number (assigned by Append Authority, per runId) */
  runSeq: number;
  /** Unique event identifier (UUID v4) */
  eventId: string;
  /** Step identifier (optional, present for step-level events) */
  stepId?: string;
  /** Platform-level retry counter (infrastructure retries) */
  engineAttemptId?: string;
  /** Business-level retry counter (logical retries) */
  logicalAttemptId?: string;
  /** Event type (e.g., "RunStarted", "StepCompleted", "RunFailed") */
  eventType: string;
  /** Event-specific payload */
  eventData: unknown;
  /** Idempotency key: SHA256(runId | stepId | logicalAttemptId | eventType | planVersion) */
  idempotencyKey: string;
  /** Timestamp when activity emitted the event (ISO 8601) */
  emittedAt: string;
  /** Timestamp when StateStore persisted the event (ISO 8601, optional) */
  persistedAt?: string;
  /** Adapter version that persisted this event (optional) */
  adapterVersion?: string;
  /** Reference to the engine run (Temporal/Conductor identifier, optional) */
  engineRunRef?: unknown;
  /** UUID of signal that caused this event (optional) */
  causedBySignalId?: string;
  /** UUID of parent event for causality tracking (optional) */
  parentEventId?: string;
}

/**
 * Step status in snapshot projection
 * @see ExecutionSemantics.v1.md § 1.4 - Snapshot Projections
 */
export type StepStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'SKIPPED';

/**
 * Step snapshot derived from event log
 * @see ExecutionSemantics.v1.md § 1.4 - Snapshot Projections
 */
export interface StepSnapshot {
  /** Step identifier */
  stepId: string;
  /** Current step status */
  status: StepStatus;
  /** Business-level attempt identifier */
  logicalAttemptId: string;
  /** Platform-level attempt identifier (optional) */
  engineAttemptId?: string;
  /** Step start timestamp (ISO 8601, optional) */
  startedAt?: string;
  /** Step completion timestamp (ISO 8601, optional) */
  completedAt?: string;
  /** Artifacts produced by this step */
  artifacts: ArtifactRef[];
  /** Error information (present when status is FAILED) */
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

/**
 * Run snapshot projection derived from event log
 * This is the authoritative derived state view
 * @see ExecutionSemantics.v1.md § 1.4 - Snapshot Projections
 */
export interface RunSnapshot {
  /** Run identifier */
  runId: string;
  /** Current run status */
  status: RunStatus;
  /** High-water mark for UI sync (highest runSeq applied) */
  lastEventSeq: number;
  /** Snapshot of all steps in the run */
  steps: StepSnapshot[];
  /** Artifacts produced by the run (aggregated from steps) */
  artifacts: ArtifactRef[];
  /** Run start timestamp (ISO 8601, optional) */
  startedAt?: string;
  /** Run completion timestamp (ISO 8601, optional) */
  completedAt?: string;
  /** Total duration in milliseconds (optional) */
  totalDurationMs?: number;
}

/**
 * Workflow state (alias for RunSnapshot for compatibility)
 * @see State Store Contract
 */
export type WorkflowState = RunSnapshot;

/**
 * Options for fetching events from state store
 * @see State Store Contract § 4 - Fetch Contract (Watermark-Based)
 */
export interface FetchEventsOptions {
  /** Fetch events with runSeq > afterSeq (watermark-based pagination) */
  afterSeq?: number;
  /** Maximum number of events to return (default: 1000) */
  limit?: number;
}

/**
 * Snapshot projector interface for deriving state from events
 * @see ExecutionSemantics.v1.md § 1.5 - Snapshot Projection Rules
 */
export interface SnapshotProjector {
  /**
   * Project a complete run snapshot from event log
   * @param runId - Run identifier
   * @param events - Ordered array of canonical engine events
   * @returns Projected run snapshot
   */
  projectRun(
    runId: string,
    events: CanonicalEngineEvent[]
  ): Promise<RunSnapshot>;

  /**
   * Incrementally update a snapshot with new events
   * @param snapshot - Previous snapshot state
   * @param newEvents - New events to apply (must be ordered by runSeq)
   * @returns Updated snapshot (immutable, new object)
   */
  incrementalProject(
    snapshot: RunSnapshot,
    newEvents: CanonicalEngineEvent[]
  ): Promise<RunSnapshot>;

  /**
   * Detect non-contiguous sequence observations
   * @param lastSeq - Last observed sequence number
   * @param nextSeq - Next sequence number observed
   * @returns Whether a gap was detected (indicates eventual consistency, not corruption)
   */
  detectNonContiguous(
    lastSeq: number,
    nextSeq: number
  ): Promise<{ observedNonContiguous: boolean }>;
}

/**
 * Core State Store interface (storage-agnostic)
 * @see State Store Contract § 1 - Core Interface
 */
export interface IRunStateStore {
  /**
   * Append a new event to the state store
   * Idempotent via idempotencyKey
   * @param event - Canonical engine event to persist
   * @returns Append result with runSeq and idempotency info
   */
  appendEvent(event: CanonicalEngineEvent): Promise<AppendResult>;

  /**
   * Fetch events for projection (ordered by runSeq)
   * @param runId - Run identifier
   * @param options - Fetch options (watermark, limit)
   * @returns Ordered array of events
   */
  fetchEvents(
    runId: string,
    options: FetchEventsOptions
  ): Promise<CanonicalEngineEvent[]>;

  /**
   * Get latest snapshot (cached/materialized view)
   * @param runId - Run identifier
   * @returns Latest run snapshot or null if not found
   */
  getSnapshot(runId: string): Promise<RunSnapshot | null>;

  /**
   * Project snapshot from event log (on-demand)
   * @param runId - Run identifier
   * @returns Freshly projected run snapshot
   */
  projectSnapshot(runId: string): Promise<RunSnapshot>;
}

/**
 * State Store adapter interface
 * Backend-specific implementations must implement this interface
 * @see State Store Contract
 */
export type StateStoreAdapter = IRunStateStore;

/**
 * Outbox event for external event delivery
 * Re-exported from core/types.ts for convenience
 * Part of the outbox pattern for eventual consistency
 * @see ExecutionSemantics.v1.md § 4 - Event Bus Integration
 */
export type { OutboxEvent };

/**
 * Run queue reconciler interface for backpressure handling
 * @see ExecutionSemantics.v1.md § 3 - Backpressure & Run Queue
 */
export interface IRunQueueReconciler {
  /**
   * Dequeue pending runs and attempt to start them
   * Stateless and idempotent operation
   * @returns Array of dequeue results
   */
  dequeueAndStart(): Promise<
    Array<{
      runId: string;
      status: 'STARTED' | 'FAILED' | 'SKIPPED';
    }>
  >;
}
