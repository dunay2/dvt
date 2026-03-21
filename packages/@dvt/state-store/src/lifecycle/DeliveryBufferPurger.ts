/**
 * Coordinator for delivery buffer purge lifecycle (G5-PR3).
 *
 * Purges non-authoritative delivery buffers on a configurable retention policy:
 *   - delivered outbox rows (default 7 days)
 *   - outbox dead-letter rows (default 30 days)
 *   - lineage dead-letter rows (default 30 days)
 *
 * Each buffer is purged independently (fail-soft): a failure in one buffer
 * does not abort the others. The coordinator emits metrics for both retained
 * row counts (before purge) and purged row counts (after purge).
 *
 * No lease is required — DELETE is idempotent and safe to run concurrently.
 */

import {
  createNoopDeliveryBufferPurgeTelemetry,
  subtractDaysFromIso,
} from './deliveryBufferRuntime.js';
import type {
  BufferPurgeResult,
  DeliveryBufferRetentionPolicy,
  DeliveryBufferPurgeTelemetry,
  IDeliveryBufferPurgeStore,
} from './deliveryBufferRuntime.js';

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validatePolicy(policy: DeliveryBufferRetentionPolicy): void {
  if (
    !Number.isInteger(policy.deliveredOutboxRetentionDays) ||
    policy.deliveredOutboxRetentionDays < 1
  ) {
    throw new Error(
      `DELIVERY_BUFFER_RETENTION_DAYS_INVALID: deliveredOutboxRetentionDays must be >= 1, got ${policy.deliveredOutboxRetentionDays}`
    );
  }
  if (
    !Number.isInteger(policy.outboxDeadLetterRetentionDays) ||
    policy.outboxDeadLetterRetentionDays < 1
  ) {
    throw new Error(
      `DELIVERY_BUFFER_RETENTION_DAYS_INVALID: outboxDeadLetterRetentionDays must be >= 1, got ${policy.outboxDeadLetterRetentionDays}`
    );
  }
  if (
    !Number.isInteger(policy.lineageDeadLetterRetentionDays) ||
    policy.lineageDeadLetterRetentionDays < 1
  ) {
    throw new Error(
      `DELIVERY_BUFFER_RETENTION_DAYS_INVALID: lineageDeadLetterRetentionDays must be >= 1, got ${policy.lineageDeadLetterRetentionDays}`
    );
  }
  if (!Number.isInteger(policy.maxRowsPerRun) || policy.maxRowsPerRun < 1) {
    throw new Error(
      `DELIVERY_BUFFER_MAX_ROWS_INVALID: maxRowsPerRun must be >= 1, got ${policy.maxRowsPerRun}`
    );
  }
}

// ---------------------------------------------------------------------------
// DeliveryBufferPurger
// ---------------------------------------------------------------------------

export interface DeliveryBufferPurgerOptions {
  readonly store: IDeliveryBufferPurgeStore;
  readonly telemetry?: DeliveryBufferPurgeTelemetry;
  readonly nowIso?: () => string;
}

export class DeliveryBufferPurger {
  private readonly store: IDeliveryBufferPurgeStore;
  private readonly telemetry: DeliveryBufferPurgeTelemetry;
  private readonly nowIso: () => string;

  constructor({ store, telemetry, nowIso }: DeliveryBufferPurgerOptions) {
    this.store = store;
    this.telemetry = telemetry ?? createNoopDeliveryBufferPurgeTelemetry();
    this.nowIso = nowIso ?? (() => new Date().toISOString());
  }

  async purge(policy: DeliveryBufferRetentionPolicy): Promise<BufferPurgeResult> {
    validatePolicy(policy);

    const now = this.nowIso();
    const result: {
      purgedDeliveredOutbox: number;
      purgedOutboxDeadLetter: number;
      purgedLineageDeadLetter: number;
    } = {
      purgedDeliveredOutbox: 0,
      purgedOutboxDeadLetter: 0,
      purgedLineageDeadLetter: 0,
    };

    // ------------------------------------------------------------------
    // Outbox: emit retained count, then purge delivered rows
    // ------------------------------------------------------------------
    try {
      const retained = await this.store.countDeliveredOutbox();
      this.telemetry.metrics.recordHistogram('dvt.outbox.retained_rows', retained);
    } catch {
      // best-effort count — do not let it block the purge
    }

    try {
      const cutoff = subtractDaysFromIso(now, policy.deliveredOutboxRetentionDays);
      result.purgedDeliveredOutbox = await this.store.purgeDeliveredOutbox(
        cutoff,
        policy.maxRowsPerRun
      );
      if (result.purgedDeliveredOutbox > 0) {
        this.telemetry.metrics.addCounter(
          'dvt.outbox.purged_rows_total',
          result.purgedDeliveredOutbox
        );
      }
      this.telemetry.logger.info(
        { purgedRows: result.purgedDeliveredOutbox },
        'delivered outbox purge complete'
      );
    } catch (err) {
      this.telemetry.metrics.addCounter('dvt.outbox.purge_failures_total', 1);
      this.telemetry.logger.error({ err }, 'delivered outbox purge failed');
    }

    // ------------------------------------------------------------------
    // Dead letters: emit combined retained count, then purge each table
    // ------------------------------------------------------------------
    try {
      const [outboxDlCount, lineageDlCount] = await Promise.all([
        this.store.countOutboxDeadLetter(),
        this.store.countLineageDeadLetter(),
      ]);
      this.telemetry.metrics.recordHistogram(
        'dvt.dead_letter.retained_rows',
        outboxDlCount + lineageDlCount
      );
    } catch {
      // best-effort count
    }

    try {
      const cutoff = subtractDaysFromIso(now, policy.outboxDeadLetterRetentionDays);
      result.purgedOutboxDeadLetter = await this.store.purgeOutboxDeadLetter(
        cutoff,
        policy.maxRowsPerRun
      );
      if (result.purgedOutboxDeadLetter > 0) {
        this.telemetry.metrics.addCounter(
          'dvt.dead_letter.purged_rows_total',
          result.purgedOutboxDeadLetter
        );
      }
      this.telemetry.logger.info(
        { purgedRows: result.purgedOutboxDeadLetter },
        'outbox dead-letter purge complete'
      );
    } catch (err) {
      this.telemetry.metrics.addCounter('dvt.dead_letter.purge_failures_total', 1);
      this.telemetry.logger.error({ err }, 'outbox dead-letter purge failed');
    }

    try {
      const cutoff = subtractDaysFromIso(now, policy.lineageDeadLetterRetentionDays);
      result.purgedLineageDeadLetter = await this.store.purgeLineageDeadLetter(
        cutoff,
        policy.maxRowsPerRun
      );
      if (result.purgedLineageDeadLetter > 0) {
        this.telemetry.metrics.addCounter(
          'dvt.dead_letter.purged_rows_total',
          result.purgedLineageDeadLetter
        );
      }
      this.telemetry.logger.info(
        { purgedRows: result.purgedLineageDeadLetter },
        'lineage dead-letter purge complete'
      );
    } catch (err) {
      this.telemetry.metrics.addCounter('dvt.dead_letter.purge_failures_total', 1);
      this.telemetry.logger.error({ err }, 'lineage dead-letter purge failed');
    }

    return result;
  }
}
