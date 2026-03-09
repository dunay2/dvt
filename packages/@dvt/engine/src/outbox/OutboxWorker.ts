/**
 * @file packages/@dvt/engine/src/outbox/OutboxWorker.ts
 * @baseline ADR-0004: Event Sourcing Strategy (Extended)
 * @decision Decision — Outbox delivery is executed in batches with explicit marking of delivered/failed
 * @consequence The publish cycle maintains operational consistency and tolerance to bus errors
 * @version 1.0.0
 * @date 2026-02-21
 */
import { MAX_OUTBOX_ATTEMPTS, type IEventBus, type IOutboxStorage } from './types.js';
import type { OutboxFailureDisposition, OutboxTickResult, OutboxWorkerObserver } from './types.js';

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
    const batch = await this.storage.listPending(this.cfg.batchSize);
    if (batch.length === 0) {
      return {
        ...emptyTickResult(),
        retryBacklogActive: await resolveRetryBacklogActive(this.storage, false),
      };
    }

    await safelyObserve(() => this.observer?.onBatchClaimed?.(batch));

    const result: OutboxTickResult = {
      claimedCount: batch.length,
      deliveredCount: 0,
      retriedCount: 0,
      deadLetteredCount: 0,
      oldestClaimedAgeMs: this.nowMs ? resolveOldestClaimedAgeMs(batch, this.nowMs()) : null,
      retryBacklogActive: false,
    };

    for (const rec of batch) {
      try {
        // Publish one envelope at a time to keep delivery accounting explicit
        // and avoid batch-level ambiguity on partial failures.
        await this.bus.publish([rec.payload]);
        await this.storage.markDelivered([rec.id]);
        result.deliveredCount += 1;
        await safelyObserve(() => this.observer?.onRecordDelivered?.(rec));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const disposition = resolveFailureDisposition(rec.attempts);
        await this.storage.markFailed(rec.id, msg);
        if (disposition === 'dead_letter') {
          result.deadLetteredCount += 1;
        } else {
          result.retriedCount += 1;
        }
        await safelyObserve(() => this.observer?.onRecordFailed?.(rec, msg, disposition));
        if (this.cfg.stopOnError) {
          result.retryBacklogActive = await resolveRetryBacklogActive(
            this.storage,
            result.retriedCount > 0
          );
          throw new OutboxWorkerTickError(err, result);
        }
      }
    }

    result.retryBacklogActive = await resolveRetryBacklogActive(
      this.storage,
      result.retriedCount > 0
    );
    return result;
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
