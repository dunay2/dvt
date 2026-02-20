import type { RunEventPersisted } from '../contracts/runEvents.js';

import type { OutboxRecord, IOutboxStorage } from './types.js';

export class InMemoryOutboxStorage implements IOutboxStorage {
  private readonly pending: OutboxRecord[] = [];
  private counter = 0;

  async enqueueTx(_runId: string, events: RunEventPersisted[]): Promise<void> {
    for (const e of events) {
      this.counter += 1;
      this.pending.push({
        id: `outbox_${this.counter}`,
        createdAt: '1970-01-01T00:00:00.000Z',
        idempotencyKey: e.idempotencyKey,
        payload: e,
        attempts: 0,
      });
    }
  }

  async listPending(limit: number): Promise<OutboxRecord[]> {
    return this.pending.slice(0, limit);
  }

  async markDelivered(ids: string[]): Promise<void> {
    const set = new Set(ids);
    for (let i = this.pending.length - 1; i >= 0; i--) {
      if (set.has(this.pending[i]!.id)) {
        this.pending.splice(i, 1);
      }
    }
  }

  async markFailed(id: string, error: string): Promise<void> {
    const rec = this.pending.find((r) => r.id === id);
    if (!rec) return;
    rec.attempts += 1;
    rec.lastError = error;
  }
}
