/**
 * @file packages/@dvt/engine/src/outbox/OutboxWorker.ts
 * @baseline ADR-0004: Event Sourcing Strategy (Extended)
 * @decision Decision — Outbox delivery is executed in batches with explicit marking of delivered/failed
 * @consequence The publish cycle maintains operational consistency and tolerance to bus errors
 * @version 1.0.0
 * @date 2026-02-21
 */
import {
  MAX_OUTBOX_ATTEMPTS,
  type IEventBus,
  type IOutboxStorage,
  OutboxFailureDisposition,
  OutboxRecord,
  OutboxTickResult,
  OutboxWorkerObserver,
} from './types.js';

export interface OutboxWorkerConfig {
  batchSize: number;
  /**
   * When true, `tick()` aborts on first publish failure after recording the
   * failed attempt in storage. Default: false (best-effort batch processing).
   */
  stopOnError?: boolean;
  /**
   * Best-effort hooks for logs/metrics. Observer failures are swallowed so
   * delivery semantics stay driven by storage and bus behavior.
   */
  observer?: OutboxWorkerObserver;
  nowMs?: () => number;
}

export class OutboxWorker {
  private readonly observer: OutboxWorkerObserver | undefined;
  private readonly nowMs: (() => number) | undefined;

  constructor(
    private readonly storage: IOutboxStorage,
    private readonly bus: IEventBus,
    private readonly cfg: OutboxWorkerConfig = { batchSize: 100, stopOnError: false }
  ) {
    this.observer = cfg.observer;
    this.nowMs = cfg.nowMs;
  }

  /**
   * Runs a single poll/deliver cycle.
   */
  async tick(): Promise<OutboxTickResult> {
    const result = emptyTickResult();
    const maxBatchSize = Math.max(0, this.cfg.batchSize);
    const seenRecordIds = new Set<string>();

    while (result.claimedCount < maxBatchSize) {
      const batch = await this.claimNextBatch(
        maxBatchSize - result.claimedCount,
        seenRecordIds,
        result
      );
      if (batch.length === 0) {
        break;
      }

      await this.processBatch(result, batch);
    }

    result.retryBacklogActive = await resolveRetryBacklogActive(
      this.storage,
      result.retriedCount > 0
    );
    return result;
  }

  private async claimNextBatch(
    remainingCapacity: number,
    seenRecordIds: Set<string>,
    result: OutboxTickResult
  ): Promise<readonly OutboxRecord[]> {
    if (remainingCapacity <= 0) {
      return [];
    }

    const batch = (await this.storage.listPending(remainingCapacity))
      .filter((record) => !seenRecordIds.has(record.id))
      .slice(0, remainingCapacity);
    if (batch.length === 0) {
      return batch;
    }

    await this.recordClaimedBatch(result, batch);
    for (const record of batch) {
      seenRecordIds.add(record.id);
    }
    return batch;
  }

  private async recordClaimedBatch(
    result: OutboxTickResult,
    batch: readonly OutboxRecord[]
  ): Promise<void> {
    await safelyObserve(() => this.observer?.onBatchClaimed?.(batch));
    result.claimedCount += batch.length;

    if (!this.nowMs) {
      return;
    }

    result.oldestClaimedAgeMs = mergeOldestClaimedAgeMs(
      result.oldestClaimedAgeMs,
      resolveOldestClaimedAgeMs(batch, this.nowMs())
    );
  }

  private async processBatch(
    result: OutboxTickResult,
    batch: readonly OutboxRecord[]
  ): Promise<void> {
    for (const record of batch) {
      await this.processRecord(result, record);
    }
  }

  private async processRecord(result: OutboxTickResult, record: OutboxRecord): Promise<void> {
    try {
      await this.publishRecord(record);
      result.deliveredCount += 1;
      await safelyObserve(() => this.observer?.onRecordDelivered?.(record));
    } catch (err) {
      await this.handlePublishFailure(result, record, err);
    }
  }

  private async publishRecord(record: OutboxRecord): Promise<void> {
    // Publish one envelope at a time to keep delivery accounting explicit
    // and avoid batch-level ambiguity on partial failures.
    await this.bus.publish([record.payload]);
    await this.storage.markDelivered([record.id]);
  }

  private async handlePublishFailure(
    result: OutboxTickResult,
    record: OutboxRecord,
    err: unknown
  ): Promise<void> {
    const msg = err instanceof Error ? err.message : String(err);
    const disposition = resolveFailureDisposition(record.attempts);
    const failedRecord = snapshotRecord(record);

    await this.storage.markFailed(record.id, msg);
    applyFailureDisposition(result, disposition);
    await safelyObserve(() => this.observer?.onRecordFailed?.(failedRecord, msg, disposition));

    if (!this.cfg.stopOnError) {
      return;
    }

    result.retryBacklogActive = await resolveRetryBacklogActive(
      this.storage,
      result.retriedCount > 0
    );
    throw new OutboxWorkerTickError(err, result);
  }
}

class OutboxWorkerTickError extends Error {
  readonly tickResult: OutboxTickResult;

  constructor(cause: unknown, tickResult: OutboxTickResult) {
    super(cause instanceof Error ? cause.message : String(cause), { cause });
    this.name = 'OutboxWorkerTickError';
    this.tickResult = tickResult;
  }
}

function emptyTickResult(): OutboxTickResult {
  return {
    claimedCount: 0,
    deliveredCount: 0,
    retriedCount: 0,
    deadLetteredCount: 0,
    oldestClaimedAgeMs: null,
    retryBacklogActive: false,
  };
}

function resolveFailureDisposition(attemptsBeforeFailure: number): OutboxFailureDisposition {
  return attemptsBeforeFailure + 1 >= MAX_OUTBOX_ATTEMPTS ? 'dead_letter' : 'retry';
}

function snapshotRecord(record: OutboxRecord): OutboxRecord {
  return { ...record };
}

function applyFailureDisposition(
  result: OutboxTickResult,
  disposition: OutboxFailureDisposition
): void {
  if (disposition === 'dead_letter') {
    result.deadLetteredCount += 1;
    return;
  }
  result.retriedCount += 1;
}

function resolveOldestClaimedAgeMs(
  records: readonly { createdAt: string }[],
  nowMs: number
): number | null {
  let oldestCreatedAtMs = Number.POSITIVE_INFINITY;

  for (const record of records) {
    const createdAtMs = Date.parse(record.createdAt);
    if (Number.isFinite(createdAtMs) && createdAtMs < oldestCreatedAtMs) {
      oldestCreatedAtMs = createdAtMs;
    }
  }

  if (!Number.isFinite(oldestCreatedAtMs)) {
    return null;
  }
  return Math.max(0, nowMs - oldestCreatedAtMs);
}

function mergeOldestClaimedAgeMs(current: number | null, candidate: number | null): number | null {
  if (current === null) {
    return candidate;
  }
  if (candidate === null) {
    return current;
  }
  return Math.max(current, candidate);
}

async function safelyObserve(fn: (() => void | Promise<void>) | undefined): Promise<void> {
  if (!fn) return;
  try {
    await fn();
  } catch {
    // Best-effort telemetry must not break delivery.
  }
}

async function resolveRetryBacklogActive(
  storage: IOutboxStorage,
  fallback: boolean
): Promise<boolean> {
  if (!storage.hasPendingRetries) {
    return fallback;
  }
  try {
    return await storage.hasPendingRetries();
  } catch {
    return fallback;
  }
}
