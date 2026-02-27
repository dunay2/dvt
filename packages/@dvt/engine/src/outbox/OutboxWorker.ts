/**
 * @file packages/@dvt/engine/src/outbox/OutboxWorker.ts
 * @baseline ADR-0004: Event Sourcing Strategy (Extended)
 * @decision Decision — Outbox delivery is executed in batches with explicit marking of delivered/failed
 * @consequence The publish cycle maintains operational consistency and tolerance to bus errors
 * @version 1.0.0
 * @date 2026-02-21
 */
import type { IEventBus, IOutboxStorage } from './types.js';

export interface OutboxWorkerConfig {
  batchSize: number;
  /**
   * When true, `tick()` aborts on first publish failure after recording the
   * failed attempt in storage. Default: false (best-effort batch processing).
   */
  stopOnError?: boolean;
}

export class OutboxWorker {
  constructor(
    private readonly storage: IOutboxStorage,
    private readonly bus: IEventBus,
    private readonly cfg: OutboxWorkerConfig = { batchSize: 100, stopOnError: false }
  ) {}

  /**
   * Runs a single poll/deliver cycle.
   */
  async tick(): Promise<void> {
    const batch = await this.storage.listPending(this.cfg.batchSize);
    if (batch.length === 0) return;

    for (const rec of batch) {
      try {
        // Publish one envelope at a time to keep delivery accounting explicit
        // and avoid batch-level ambiguity on partial failures.
        await this.bus.publish([rec.payload]);
        await this.storage.markDelivered([rec.id]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await this.storage.markFailed(rec.id, msg);
        if (this.cfg.stopOnError) {
          throw err;
        }
      }
    }
  }
}
