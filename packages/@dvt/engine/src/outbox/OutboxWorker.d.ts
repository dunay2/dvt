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
}
export declare class OutboxWorker {
  private readonly storage;
  private readonly bus;
  private readonly cfg;
  constructor(storage: IOutboxStorage, bus: IEventBus, cfg?: OutboxWorkerConfig);
  /**
   * Runs a single poll/deliver cycle.
   */
  tick(): Promise<void>;
}
//# sourceMappingURL=OutboxWorker.d.ts.map
