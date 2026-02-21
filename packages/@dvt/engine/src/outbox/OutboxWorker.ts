import type { IEventBus, IOutboxStorage } from './types.js';

export interface OutboxWorkerConfig {
  batchSize: number;
}

export class OutboxWorker {
  constructor(
    private readonly storage: IOutboxStorage,
    private readonly bus: IEventBus,
    private readonly cfg: OutboxWorkerConfig = { batchSize: 100 }
  ) {}

  /**
   * Runs a single poll/deliver cycle.
   */
  async tick(): Promise<void> {
    const batch = await this.storage.listPending(this.cfg.batchSize);
    if (batch.length === 0) return;

    try {
      await this.bus.publish(batch.map((r) => r.payload));
      await this.storage.markDelivered(batch.map((r) => r.id));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Mark all as failed for simplicity in MVP.
      for (const rec of batch) {
        await this.storage.markFailed(rec.id, msg);
      }
      throw err;
    }
  }
}
