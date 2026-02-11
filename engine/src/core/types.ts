/**
 * Core types for DVT Engine
 * Based on ROADMAP.md - Anchor Decision: Outbox Semantics
 *
 * Note: Use of Date is intentional for data structures, not in Temporal workflows
 */

/* eslint-disable no-restricted-globals */

/**
 * Outbox event structure for external event delivery
 * Consumers must deduplicate using idempotencyKey (upsert semantics)
 */
export interface OutboxEvent {
  /** Unique event identifier */
  eventId: string;

  /** Run identifier */
  runId: string;

  /** Event type (e.g., RunStarted, StepCompleted) */
  eventType: string;

  /** Unique key for idempotent delivery: tenantId + contractVersion + eventType + runId + stepId + attemptId */
  idempotencyKey: string;

  /** Step identifier (optional) */
  stepId?: string;

  /** Event payload */
  payload: unknown;

  /** Timestamp when event was created */
  createdAt: Date;

  /** Timestamp when event was delivered (null if not yet delivered) */
  deliveredAt: Date | null;
}

/**
 * Result of appending an event to the outbox
 */
export interface AppendResult {
  /** Assigned run sequence number */
  runSeq: number;

  /** True if this was a duplicate (same idempotencyKey) */
  idempotent: boolean;

  /** True if a new event was written */
  persisted: boolean;
}

/**
 * Metrics for outbox delivery monitoring
 */
export interface OutboxMetrics {
  /** Number of seconds of lag in delivery */
  deliveryLagSeconds: number;

  /** Number of events delivered per second */
  deliveryRate: number;

  /** Total number of undelivered events */
  undeliveredCount: number;

  /** Timestamp when metrics were collected */
  timestamp: Date;
}

/**
 * Configuration for OutboxWorker
 */
export interface OutboxWorkerConfig {
  /** Polling interval in milliseconds (default: 100) */
  pollIntervalMs?: number;

  /** Maximum number of events to fetch per batch (default: 100) */
  batchSize?: number;

  /** Initial retry delay in milliseconds (default: 100) */
  initialRetryDelayMs?: number;

  /** Maximum retry delay in milliseconds (default: 30000) */
  maxRetryDelayMs?: number;

  /** Circuit breaker threshold for lag in seconds (default: 5) */
  circuitBreakerLagSeconds?: number;

  /** Backoff multiplier for exponential backoff (default: 2) */
  backoffMultiplier?: number;
}
