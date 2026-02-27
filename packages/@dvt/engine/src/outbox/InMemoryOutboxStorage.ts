/**
 * @file packages/@dvt/engine/src/outbox/InMemoryOutboxStorage.ts
 * @baseline ADR-0004: Event Sourcing Strategy (Extended)
 * @decision Decision — The outbox storage maintains at-least-once delivery with explicit transition to dead-letter
 * @consequence Event publication preserves durability and operational idempotency in the face of delivery failures
 * @version 1.0.0
 * @date 2026-02-21
 */
import type { RunEventPersisted } from '../contracts/runEvents.js';
import { epochMsToIsoUtc, parseIsoUtcToEpochMs } from '../utils/clock.js';

import type { DeadLetterRecord, OutboxRecord, IOutboxStorage } from './types.js';
import { MAX_OUTBOX_ATTEMPTS } from './types.js';

export class InMemoryOutboxStorage implements IOutboxStorage {
  private static readonly EPOCH_MS = parseIsoUtcToEpochMs('1970-01-01T00:00:00.000Z');

  private readonly pending: OutboxRecord[] = [];
  private readonly deadLetters: DeadLetterRecord[] = [];
  private counter = 0;
  private readonly nowMs: () => number;

  constructor(deps?: { nowMs?: () => number }) {
    this.nowMs = deps?.nowMs ?? (() => InMemoryOutboxStorage.EPOCH_MS);
  }

  private nowIsoUtc(): string {
    return epochMsToIsoUtc(this.nowMs());
  }

  private computeNextAttemptAtIso(attempts: number): string {
    // Exponential backoff base 1s, capped at 60s.
    const delayMs = Math.min(60_000, 1_000 * 2 ** Math.max(0, attempts - 1));
    return epochMsToIsoUtc(this.nowMs() + delayMs);
  }

  async enqueueTx(_runId: string, events: RunEventPersisted[]): Promise<void> {
    for (const e of events) {
      this.counter += 1;
      this.pending.push({
        id: `outbox_${this.counter}`,
        createdAt: this.nowIsoUtc(),
        idempotencyKey: e.idempotencyKey,
        payload: e,
        attempts: 0,
      });
    }
  }

  async listPending(limit: number): Promise<OutboxRecord[]> {
    const nowMs = this.nowMs();
    const eligible = this.pending.filter((r) => {
      if (!r.nextAttemptAt) return true;
      const t = Date.parse(r.nextAttemptAt);
      return Number.isFinite(t) ? t <= nowMs : true;
    });

    eligible.sort((a, b) => {
      const an = a.nextAttemptAt ? Date.parse(a.nextAttemptAt) : InMemoryOutboxStorage.EPOCH_MS;
      const bn = b.nextAttemptAt ? Date.parse(b.nextAttemptAt) : InMemoryOutboxStorage.EPOCH_MS;
      if (an !== bn) return an - bn;
      return Date.parse(a.createdAt) - Date.parse(b.createdAt);
    });

    return eligible.slice(0, limit);
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
    const idx = this.pending.findIndex((r) => r.id === id);
    if (idx === -1) return;
    const rec = this.pending[idx]!;
    rec.attempts += 1;
    rec.lastError = error;

    if (rec.attempts >= MAX_OUTBOX_ATTEMPTS) {
      this.pending.splice(idx, 1);
      this.deadLetters.push({
        id: `dl_${rec.id}`,
        originalId: rec.id,
        runId: rec.payload.runId,
        payload: rec.payload,
        lastError: error,
        deadLetteredAt: this.nowIsoUtc(),
      });
      return;
    }

    rec.nextAttemptAt = this.computeNextAttemptAtIso(rec.attempts);
  }

  async listDeadLetter(limit: number): Promise<DeadLetterRecord[]> {
    return this.deadLetters.slice(0, limit);
  }

  async replayDeadLetters(options?: {
    limit?: number;
    runId?: string;
    ids?: string[];
  }): Promise<number> {
    const limit = Math.max(0, options?.limit ?? Number.MAX_SAFE_INTEGER);
    if (limit === 0) return 0;

    const ids = options?.ids ? new Set(options.ids) : null;
    let moved = 0;

    for (let i = this.deadLetters.length - 1; i >= 0 && moved < limit; i -= 1) {
      const dl = this.deadLetters[i]!;
      if (options?.runId && dl.runId !== options.runId) continue;
      if (ids && !ids.has(dl.id)) continue;

      this.pending.push({
        id: dl.originalId,
        createdAt: this.nowIsoUtc(),
        idempotencyKey: dl.payload.idempotencyKey,
        payload: dl.payload,
        attempts: 0,
      });

      this.deadLetters.splice(i, 1);
      moved += 1;
    }

    return moved;
  }
}
