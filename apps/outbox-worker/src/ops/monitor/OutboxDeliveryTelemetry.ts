import type { OutboxRecord } from '@dvt/contracts';
import type {
  OutboxFailureDisposition,
  OutboxTickResult,
} from '@dvt/delivery';

import type { OutboxWorkerRuntimeLogger } from '../../runtime/OutboxWorkerRuntime.js';

import {
  DELIVERY_EVENT_LATENCY_BUCKETS_MS,
  type DeliveryFailureSignal,
  type OutboxDeliveryMetricsSnapshot,
} from './model.js';
import {
  resolveLagSeconds,
  resolveOldestRecord,
  roundToMillis,
  toRecordLog,
} from './support.js';

interface OutboxDeliveryTelemetryOptions {
  logger: OutboxWorkerRuntimeLogger;
  nowMs?: () => number;
}

export class OutboxDeliveryTelemetry {
  private readonly logger: OutboxWorkerRuntimeLogger;
  private readonly nowMs: () => number;

  private claimedRecordsTotal = 0;
  private deliveredRecordsTotal = 0;
  private retriedRecordsTotal = 0;
  private deadLetteredRecordsTotal = 0;
  private ticksTotal = 0;
  private lastClaimedLagSeconds = 0;
  private lastBatchClaimedCount = 0;
  private pendingDeliveryFailureAtMs: number | null = null;
  private pendingDeliveryFailureMessage: string | null = null;
  private readonly claimedAtByRecordId = new Map<string, number>();
  private readonly eventDeliveryLatencyBucketCounts = DELIVERY_EVENT_LATENCY_BUCKETS_MS.map(
    () => 0
  );
  private eventDeliveryLatencyCount = 0;
  private eventDeliveryLatencySumMs = 0;

  constructor(options: OutboxDeliveryTelemetryOptions) {
    this.logger = options.logger;
    this.nowMs = options.nowMs ?? (() => Date.now());
  }

  onTick(result: OutboxTickResult): void {
    this.ticksTotal += 1;
    this.claimedRecordsTotal += result.claimedCount;
    this.deliveredRecordsTotal += result.deliveredCount;
    this.retriedRecordsTotal += result.retriedCount;
    this.deadLetteredRecordsTotal += result.deadLetteredCount;
    this.lastClaimedLagSeconds =
      result.oldestClaimedAgeMs === null ? 0 : roundToMillis(result.oldestClaimedAgeMs / 1000);
    this.lastBatchClaimedCount = result.claimedCount;
  }

  onBatchClaimed(records: readonly OutboxRecord[]): void {
    const claimedAtMs = this.nowMs();
    for (const record of records) {
      this.claimedAtByRecordId.set(record.id, claimedAtMs);
    }

    const oldestRecord = resolveOldestRecord(records);
    const oldestLagSeconds =
      oldestRecord === null
        ? 0
        : roundToMillis(resolveLagSeconds(oldestRecord.createdAt, this.nowMs()));

    this.logger.info(
      {
        claimedCount: records.length,
        oldestCreatedAt: oldestRecord?.createdAt,
        oldestLagSeconds,
      },
      'outbox records claimed'
    );
  }

  onRecordDelivered(record: OutboxRecord): void {
    this.observeEventDeliveryLatency(record.id);
    this.logger.info(toRecordLog(record), 'outbox record delivered');
  }

  onRecordFailed(
    record: OutboxRecord,
    error: string,
    disposition: OutboxFailureDisposition
  ): void {
    this.observeEventDeliveryLatency(record.id);
    this.pendingDeliveryFailureMessage = error;
    this.pendingDeliveryFailureAtMs = this.nowMs();
    const data = {
      ...toRecordLog(record),
      error,
      attemptsAfterFailure: record.attempts + 1,
      disposition,
    };

    if (disposition === 'dead_letter') {
      this.logger.error(data, 'outbox record dead-lettered');
      return;
    }

    this.logger.warn?.(data, 'outbox record scheduled for retry');
  }

  consumePendingFailure(): DeliveryFailureSignal | null {
    if (
      this.pendingDeliveryFailureAtMs === null &&
      this.pendingDeliveryFailureMessage === null
    ) {
      return null;
    }

    const failure = {
      errorAtMs: this.pendingDeliveryFailureAtMs,
      errorMessage: this.pendingDeliveryFailureMessage,
    };
    this.pendingDeliveryFailureAtMs = null;
    this.pendingDeliveryFailureMessage = null;
    return failure;
  }

  clearClaims(): void {
    this.claimedAtByRecordId.clear();
  }

  getMetricsSnapshot(): OutboxDeliveryMetricsSnapshot {
    return {
      claimedRecordsTotal: this.claimedRecordsTotal,
      deliveredRecordsTotal: this.deliveredRecordsTotal,
      retriedRecordsTotal: this.retriedRecordsTotal,
      deadLetteredRecordsTotal: this.deadLetteredRecordsTotal,
      ticksTotal: this.ticksTotal,
      lastClaimedLagSeconds: this.lastClaimedLagSeconds,
      lastBatchClaimedCount: this.lastBatchClaimedCount,
      eventDeliveryLatencyBucketCounts: [...this.eventDeliveryLatencyBucketCounts],
      eventDeliveryLatencyCount: this.eventDeliveryLatencyCount,
      eventDeliveryLatencySumMs: this.eventDeliveryLatencySumMs,
    };
  }

  private observeEventDeliveryLatency(recordId: string): void {
    const claimedAtMs = this.claimedAtByRecordId.get(recordId);
    if (claimedAtMs === undefined) {
      return;
    }

    this.claimedAtByRecordId.delete(recordId);
    const elapsedMs = Math.max(0, this.nowMs() - claimedAtMs);
    this.eventDeliveryLatencyCount += 1;
    this.eventDeliveryLatencySumMs += elapsedMs;

    for (const [index, bucketUpperBound] of DELIVERY_EVENT_LATENCY_BUCKETS_MS.entries()) {
      if (elapsedMs <= bucketUpperBound) {
        const bucketCount = this.eventDeliveryLatencyBucketCounts[index] ?? 0;
        this.eventDeliveryLatencyBucketCounts[index] = bucketCount + 1;
      }
    }
  }
}
