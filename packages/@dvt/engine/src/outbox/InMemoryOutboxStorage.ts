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

type ReplayDeadLetterOptions = {
  limit?: number;
  runId?: string;
  ids?: string[];
};

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

  private buildHeadRunSeqByRunId(blockedRunIds: ReadonlySet<string>): Map<string, number> {
    const headRunSeqByRunId = new Map<string, number>();

    for (const record of this.pending) {
      const runId = record.payload.runId;
      if (blockedRunIds.has(runId)) {
        continue;
      }
      const currentHeadRunSeq = headRunSeqByRunId.get(runId);
      if (currentHeadRunSeq === undefined || record.payload.runSeq < currentHeadRunSeq) {
        headRunSeqByRunId.set(runId, record.payload.runSeq);
      }
    }

    return headRunSeqByRunId;
  }

  private isPendingRecordEligible(
    record: OutboxRecord,
    blockedRunIds: ReadonlySet<string>,
    headRunSeqByRunId: ReadonlyMap<string, number>,
    nowMs: number
  ): boolean {
    const runId = record.payload.runId;
    if (blockedRunIds.has(runId)) {
      return false;
    }
    if (headRunSeqByRunId.get(runId) !== record.payload.runSeq) {
      return false;
    }
    if (!record.nextAttemptAt) {
      return true;
    }

    const nextAttemptAtMs = Date.parse(record.nextAttemptAt);
    return Number.isFinite(nextAttemptAtMs) ? nextAttemptAtMs <= nowMs : true;
  }

  private static compareEligibleRecords(a: OutboxRecord, b: OutboxRecord): number {
    const createdAtDiff = Date.parse(a.createdAt) - Date.parse(b.createdAt);
    if (createdAtDiff !== 0) {
      return createdAtDiff;
    }
    return a.payload.runSeq - b.payload.runSeq;
  }

  private matchesReplaySelection(
    deadLetter: DeadLetterRecord,
    options: { runId?: string } | undefined,
    ids: ReadonlySet<string> | null
  ): boolean {
    if (options?.runId && deadLetter.runId !== options.runId) {
      return false;
    }
    if (ids && !ids.has(deadLetter.id)) {
      return false;
    }
    return true;
  }

  private restoreDeadLetter(deadLetter: DeadLetterRecord): void {
    this.pending.push({
      id: deadLetter.originalId,
      createdAt: this.nowIsoUtc(),
      idempotencyKey: deadLetter.payload.idempotencyKey,
      payload: deadLetter.payload,
      attempts: 0,
    });
  }

  private collectReplayDeadLetterIndexes(
    limit: number,
    options: ReplayDeadLetterOptions | undefined,
    ids: ReadonlySet<string> | null
  ): number[] {
    const indexes: number[] = [];

    for (let i = this.deadLetters.length - 1; i >= 0 && indexes.length < limit; i -= 1) {
      const deadLetter = this.deadLetters[i];
      if (!deadLetter || !this.matchesReplaySelection(deadLetter, options, ids)) {
        continue;
      }
      indexes.push(i);
    }

    return indexes;
  }

  private replayDeadLettersAtIndexes(indexes: readonly number[]): number {
    let moved = 0;

    for (const index of indexes) {
      const deadLetter = this.deadLetters[index];
      if (!deadLetter) {
        continue;
      }

      this.restoreDeadLetter(deadLetter);
      this.deadLetters.splice(index, 1);
      moved += 1;
    }

    return moved;
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
    const boundedLimit = Math.max(0, limit);
    if (boundedLimit === 0) {
      return [];
    }

    const nowMs = this.nowMs();
    const blockedRunIds = new Set(this.deadLetters.map((record) => record.runId));
    const headRunSeqByRunId = this.buildHeadRunSeqByRunId(blockedRunIds);
    const eligible = this.pending.filter((record) =>
      this.isPendingRecordEligible(record, blockedRunIds, headRunSeqByRunId, nowMs)
    );

    eligible.sort(InMemoryOutboxStorage.compareEligibleRecords);

    return eligible.slice(0, boundedLimit);
  }

  async markDelivered(ids: string[]): Promise<void> {
    const set = new Set(ids);
    for (let i = this.pending.length - 1; i >= 0; i--) {
      const record = this.pending[i];
      if (record && set.has(record.id)) {
        this.pending.splice(i, 1);
      }
    }
  }

  async markFailed(id: string, error: string): Promise<void> {
    const idx = this.pending.findIndex((r) => r.id === id);
    if (idx === -1) return;
    const rec = this.pending[idx];
    if (!rec) return;
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

  async hasPendingRetries(): Promise<boolean> {
    return this.pending.some((record) => record.attempts > 0);
  }

  async listDeadLetter(limit: number): Promise<DeadLetterRecord[]> {
    return this.deadLetters.slice(0, limit);
  }

  async replayDeadLetters(options?: ReplayDeadLetterOptions): Promise<number> {
    const limit = Math.max(0, options?.limit ?? Number.MAX_SAFE_INTEGER);
    if (limit === 0) {
      return 0;
    }

    const ids = options?.ids ? new Set(options.ids) : null;
    const indexes = this.collectReplayDeadLetterIndexes(limit, options, ids);
    return this.replayDeadLettersAtIndexes(indexes);
  }
}
