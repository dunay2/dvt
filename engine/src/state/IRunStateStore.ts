/**
 * DVT Engine - State Store Interface
 * Reference: State Store Contract (contracts/state-store/README.md)
 * Phase 1: Core interface for append-only event storage and outbox pattern
 */

import {
  CanonicalEngineEvent,
  RunSnapshot,
} from '../types/contracts';

// ============================================================================
// IRunStateStore Interface
// ============================================================================

/**
 * Storage-agnostic interface for workflow execution state.
 * Implementations: Postgres, Snowflake, etc.
 *
 * Reference: State Store Contract § 1
 */
export interface IRunStateStore {
  /**
   * Append a new event to the event log (idempotent via idempotencyKey).
   *
   * @param event - Canonical engine event to append
   * @returns Result with assigned runSeq and idempotency flag
   */
  appendEvent(event: CanonicalEngineEvent): Promise<AppendResult>;

  /**
   * Fetch events for a run (ordered by runSeq).
   * Used for projection and watermark-based sync.
   *
   * @param runId - Run identifier
   * @param options - Pagination and watermark options
   * @returns Array of events (may have gaps in runSeq)
   */
  fetchEvents(
    runId: string,
    options?: {
      afterSeq?: number; // Fetch events with runSeq > afterSeq (watermark)
      limit?: number; // Pagination (default: 1000)
    },
  ): Promise<CanonicalEngineEvent[]>;

  /**
   * Get latest snapshot (cached/materialized view).
   * Fast read path for UI and status checks.
   *
   * @param runId - Run identifier
   * @returns Snapshot or null if not found
   */
  getSnapshot(runId: string): Promise<RunSnapshot | null>;

  /**
   * Project snapshot from event log (on-demand).
   * Used when cache is stale or for historical point-in-time views.
   *
   * @param runId - Run identifier
   * @returns Projected snapshot
   */
  projectSnapshot(runId: string): Promise<RunSnapshot>;
}

/**
 * Result of appending an event.
 */
export interface AppendResult {
  runSeq: number; // Assigned by Append Authority (monotonic per runId)
  idempotent: boolean; // true if duplicate (same idempotencyKey)
  eventId: string; // Event identifier
}

// ============================================================================
// Outbox Pattern for Event Bus Integration
// ============================================================================

/**
 * Outbox storage interface for eventually-consistent event delivery.
 * Reference: ROADMAP.md - Anchor Decision: Outbox Semantics
 *
 * Phase 1: Core interface
 * Phase 2+: Retry worker, backpressure handling
 */
export interface IOutboxStorage {
  /**
   * Append event to outbox (transactional with state change).
   * MUST be called within the same transaction as appendEvent().
   *
   * @param event - Outbox event to enqueue
   */
  appendOutbox(event: OutboxEvent): Promise<void>;

  /**
   * Mark event as delivered (idempotent).
   * Called by retry worker after successful EventBus publish.
   *
   * @param eventId - Event identifier
   */
  markDelivered(eventId: string): Promise<void>;

  /**
   * Pull undelivered events for retry (consistent read).
   * Used by retry worker to fetch pending events.
   *
   * @param limit - Maximum number of events to fetch
   * @returns Array of pending events
   */
  pullUndelivered(limit: number): Promise<OutboxEvent[]>;
}

/**
 * Outbox event for EventBus delivery.
 */
export interface OutboxEvent {
  eventId: string; // Same as CanonicalEngineEvent.eventId
  runId: string;
  eventType: string;
  payload: CanonicalEngineEvent; // Full event payload
  status: 'pending' | 'retry' | 'delivered' | 'dlq';
  createdAt: string; // ISO 8601 UTC
  lastAttemptAt?: string; // ISO 8601 UTC
  attemptCount: number;
  nextRetryAt?: string; // ISO 8601 UTC (exponential backoff)
  error?: string; // Last error message
}

// ============================================================================
// Mock Implementation for Testing (Phase 1)
// ============================================================================

/**
 * In-memory StateStore implementation for testing.
 * Phase 1: Minimal mock for TemporalAdapter tests.
 * Phase 2+: Full Postgres/Snowflake adapters.
 */
export class InMemoryStateStore implements IRunStateStore {
  private events: Map<string, CanonicalEngineEvent[]> = new Map();
  private snapshots: Map<string, RunSnapshot> = new Map();
  private seqCounter: Map<string, number> = new Map();

  appendEvent(event: CanonicalEngineEvent): Promise<AppendResult> {
    const runId = event.runId;

    // Check for duplicate idempotencyKey
    const existing = this.events.get(runId) || [];
    const duplicate = existing.find(
      (e) => e.idempotencyKey === event.idempotencyKey,
    );

    if (duplicate) {
      return Promise.resolve({
        runSeq: duplicate.runSeq,
        idempotent: true,
        eventId: duplicate.eventId,
      });
    }

    // Assign runSeq (monotonic per runId)
    const currentSeq = this.seqCounter.get(runId) || 0;
    const nextSeq = currentSeq + 1;
    this.seqCounter.set(runId, nextSeq);

    const eventWithSeq = { ...event, runSeq: nextSeq };
    existing.push(eventWithSeq);
    this.events.set(runId, existing);

    return Promise.resolve({
      runSeq: nextSeq,
      idempotent: false,
      eventId: event.eventId,
    });
  }

  fetchEvents(
    runId: string,
    options?: { afterSeq?: number; limit?: number },
  ): Promise<CanonicalEngineEvent[]> {
    const events = this.events.get(runId) || [];
    const afterSeq = options?.afterSeq ?? 0;
    const limit = options?.limit ?? 1000;

    return Promise.resolve(
      events
        .filter((e) => e.runSeq > afterSeq)
        .sort((a, b) => a.runSeq - b.runSeq)
        .slice(0, limit),
    );
  }

  getSnapshot(runId: string): Promise<RunSnapshot | null> {
    return Promise.resolve(this.snapshots.get(runId) || null);
  }

  projectSnapshot(runId: string): Promise<RunSnapshot> {
    const events = this.events.get(runId) || [];

    // Simple projection: derive state from events
    const snapshot: RunSnapshot = {
      runId,
      status: 'PENDING',
      lastEventSeq: events.length > 0 ? events[events.length - 1]!.runSeq : 0,
      steps: [],
      artifacts: [],
      tenantId: '',
      projectId: '',
      environmentId: '',
    };

    // Update snapshot based on events
    for (const event of events) {
      switch (event.eventType) {
        case 'RunApproved':
          snapshot.status = 'APPROVED';
          break;
        case 'RunStarted':
          snapshot.status = 'RUNNING';
          snapshot.startedAt = (event as { startedAt: string }).startedAt;
          break;
        case 'RunPaused':
          snapshot.status = 'PAUSED';
          break;
        case 'RunResumed':
          snapshot.status = 'RUNNING';
          break;
        case 'RunCompleted':
          snapshot.status = 'COMPLETED';
          snapshot.completedAt = (event as { completedAt: string }).completedAt;
          break;
        case 'RunFailed':
          snapshot.status = 'FAILED';
          snapshot.completedAt = (event as { failedAt: string }).failedAt;
          break;
        case 'RunCancelled':
          snapshot.status = 'CANCELLED';
          snapshot.completedAt = (event as { cancelledAt: string })
            .cancelledAt;
          break;
      }
    }

    // Cache the projected snapshot
    this.snapshots.set(runId, snapshot);

    return Promise.resolve(snapshot);
  }
}
