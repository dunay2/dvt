import type { OutboxRecord } from '@dvt/contracts';

import {
  MAX_OUTBOX_ATTEMPTS,
  type IEventBus,
  type IOutboxStorage,
  type OutboxClaimSelection,
  type OutboxFailureDisposition,
  type OutboxTickResult,
  type OutboxWorkerObserver,
} from '../contracts.js';

export interface OutboxWorkerConfig {
  batchSize: number;
  stopOnError?: boolean;
  observer?: OutboxWorkerObserver;
  claimSelection?: OutboxClaimSelection | (() => OutboxClaimSelection | undefined);
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

  async tick(): Promise<OutboxTickResult> {
    const result = emptyTickResult();
    const maxBatchSize = Math.max(0, this.cfg.batchSize);
    const seenRecordIds = new Set<string>();
    const claimSelection = resolveClaimSelection(this.cfg.claimSelection);

    while (result.claimedCount < maxBatchSize) {
      const batch = await this.claimNextBatch(
        maxBatchSize - result.claimedCount,
        seenRecordIds,
        result,
        claimSelection
      );
      if (batch.length === 0) {
        break;
      }

      await this.processBatch(result, batch, claimSelection);
    }

    result.retryBacklogActive = await resolveRetryBacklogActive(
      this.storage,
      claimSelection,
      result.retriedCount > 0
    );
    return result;
  }

  private async claimNextBatch(
    remainingCapacity: number,
    seenRecordIds: Set<string>,
    result: OutboxTickResult,
    claimSelection: OutboxClaimSelection | undefined
  ): Promise<readonly OutboxRecord[]> {
    if (remainingCapacity <= 0) {
      return [];
    }

    const batch = (await this.listPendingForClaim(remainingCapacity, claimSelection))
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

  private async listPendingForClaim(
    limit: number,
    selection: OutboxClaimSelection | undefined
  ): Promise<OutboxRecord[]> {
    if (this.storage.listPendingForClaim) {
      return this.storage.listPendingForClaim(limit, selection);
    }
    return this.storage.listPending(limit);
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
    batch: readonly OutboxRecord[],
    claimSelection?: OutboxClaimSelection
  ): Promise<void> {
    for (const record of batch) {
      await this.processRecord(result, record, claimSelection);
    }
  }

  private async processRecord(
    result: OutboxTickResult,
    record: OutboxRecord,
    claimSelection?: OutboxClaimSelection
  ): Promise<void> {
    try {
      await this.publishRecord(record);
      result.deliveredCount += 1;
      await safelyObserve(() => this.observer?.onRecordDelivered?.(record));
    } catch (err) {
      await this.handlePublishFailure(result, record, err, claimSelection);
    }
  }

  private async publishRecord(record: OutboxRecord): Promise<void> {
    await this.bus.publish([record.payload]);
    await this.storage.markDelivered([record.id]);
  }

  private async handlePublishFailure(
    result: OutboxTickResult,
    record: OutboxRecord,
    err: unknown,
    claimSelection?: OutboxClaimSelection
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
      claimSelection,
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
  selection: OutboxClaimSelection | undefined,
  fallback: boolean
): Promise<boolean> {
  if (!storage.hasPendingRetries) {
    return fallback;
  }
  try {
    return await storage.hasPendingRetries(selection);
  } catch {
    return fallback;
  }
}

function resolveClaimSelection(
  selection: OutboxClaimSelection | (() => OutboxClaimSelection | undefined) | undefined
): OutboxClaimSelection | undefined {
  if (typeof selection === 'function') {
    return selection();
  }
  return selection;
}
