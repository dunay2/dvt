/**
 * Contracts for the delivery buffer purge lifecycle (G5-PR3).
 *
 * Covers three non-authoritative buffers that accumulate rows over time and
 * require explicit retention policies:
 *
 *   outbox              — delivered rows (delivered_at IS NOT NULL)
 *   outbox_dead_letter  — rows that exhausted all retry attempts
 *   lineage_dead_letter — lineage records that exhausted all retry attempts
 *
 * Note: lineage_outbox rows are hard-deleted immediately on successful delivery
 * (markDelivered does DELETE), so there are no "delivered but retained" lineage
 * outbox rows — no purge is required for that table.
 */

// ---------------------------------------------------------------------------
// Policy
// ---------------------------------------------------------------------------

export interface DeliveryBufferRetentionPolicy {
  /** Days to retain delivered outbox rows after delivery. Default: 7. */
  readonly deliveredOutboxRetentionDays: number;
  /** Days to retain outbox dead-letter rows after dead-lettering. Default: 30. */
  readonly outboxDeadLetterRetentionDays: number;
  /** Days to retain lineage dead-letter rows after dead-lettering. Default: 30. */
  readonly lineageDeadLetterRetentionDays: number;
  /** Maximum rows to delete in a single purge run (prevents long-running deletes). */
  readonly maxRowsPerRun: number;
}

export const DEFAULT_DELIVERY_BUFFER_RETENTION: DeliveryBufferRetentionPolicy = {
  deliveredOutboxRetentionDays: 7,
  outboxDeadLetterRetentionDays: 30,
  lineageDeadLetterRetentionDays: 30,
  maxRowsPerRun: 5_000,
};

// ---------------------------------------------------------------------------
// Result
// ---------------------------------------------------------------------------

export interface BufferPurgeResult {
  readonly purgedDeliveredOutbox: number;
  readonly purgedOutboxDeadLetter: number;
  readonly purgedLineageDeadLetter: number;
}

// ---------------------------------------------------------------------------
// Store contract
// ---------------------------------------------------------------------------

export interface IDeliveryBufferPurgeStore {
  /** Delete delivered outbox rows older than olderThanIso, up to limit rows. */
  purgeDeliveredOutbox(olderThanIso: string, limit: number): Promise<number>;
  /** Delete outbox dead-letter rows older than olderThanIso, up to limit rows. */
  purgeOutboxDeadLetter(olderThanIso: string, limit: number): Promise<number>;
  /** Delete lineage dead-letter rows older than olderThanIso, up to limit rows. */
  purgeLineageDeadLetter(olderThanIso: string, limit: number): Promise<number>;
  /** Count delivered outbox rows (for retained_rows metric). */
  countDeliveredOutbox(): Promise<number>;
  /** Count outbox dead-letter rows (for retained_rows metric). */
  countOutboxDeadLetter(): Promise<number>;
  /** Count lineage dead-letter rows (for retained_rows metric). */
  countLineageDeadLetter(): Promise<number>;
}

// ---------------------------------------------------------------------------
// Telemetry
// ---------------------------------------------------------------------------

export interface DeliveryBufferPurgeMetrics {
  addCounter(name: string, value: number): void;
  recordHistogram(name: string, value: number): void;
}

export interface DeliveryBufferPurgeLogger {
  info(data: Record<string, unknown>, msg: string): void;
  error(data: Record<string, unknown>, msg: string): void;
}

export interface DeliveryBufferPurgeTelemetry {
  readonly metrics: DeliveryBufferPurgeMetrics;
  readonly logger: DeliveryBufferPurgeLogger;
}

export function createNoopDeliveryBufferPurgeTelemetry(): DeliveryBufferPurgeTelemetry {
  return {
    metrics: { addCounter() {}, recordHistogram() {} },
    logger: { info() {}, error() {} },
  };
}

// ---------------------------------------------------------------------------
// Date helper (exported for testability)
// ---------------------------------------------------------------------------

/** Returns an ISO-8601 timestamp for nowIso minus the given number of days. */
export function subtractDaysFromIso(nowIso: string, days: number): string {
  const ms = new Date(nowIso).getTime() - days * 24 * 60 * 60 * 1000;
  return new Date(ms).toISOString();
}
