import { createHash } from 'node:crypto';

import {
  MAX_OUTBOX_ATTEMPTS,
  asIsoUtcString,
  epochMsToIsoUtc,
  type IsoUtcString,
  type DeadLetterRecord,
  type EventEnvelope,
  type IOutboxStorage,
  type OutboxClaimSelection,
  type OutboxRecord,
  parseIsoUtcToEpochMs,
} from '@dvt/contracts';

type ReplayDeadLetterOptions = {
  tenantId: string;
  limit?: number;
  runId?: string;
  ids?: string[];
};

interface PersistedOutboxRecord extends OutboxRecord {
  shardId: number;
}

interface PersistedDeadLetterRecord extends DeadLetterRecord {
  shardId: number;
}

export class InMemoryOutboxState implements IOutboxStorage {
  private static readonly EPOCH_MS = parseIsoUtcToEpochMs(
    asIsoUtcString('1970-01-01T00:00:00.000Z')
  );

  private readonly pending: PersistedOutboxRecord[] = [];
  private readonly deadLetters: PersistedDeadLetterRecord[] = [];
  private counter = 0;
  private readonly nowMs: () => number;
  private readonly shardCount: number;

  constructor(deps?: { nowMs?: () => number; shardCount?: number }) {
    this.nowMs = deps?.nowMs ?? (() => InMemoryOutboxState.EPOCH_MS);
    this.shardCount = Math.max(1, deps?.shardCount ?? 1);
  }

  private nowIsoUtc(): IsoUtcString {
    return epochMsToIsoUtc(this.nowMs());
  }

  private computeNextAttemptAtIso(attempts: number): IsoUtcString {
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
    record: PersistedOutboxRecord,
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

  private static compareEligibleRecords(
    a: PersistedOutboxRecord,
    b: PersistedOutboxRecord
  ): number {
    const createdAtDiff = Date.parse(a.createdAt) - Date.parse(b.createdAt);
    if (createdAtDiff !== 0) {
      return createdAtDiff;
    }
    return a.payload.runSeq - b.payload.runSeq;
  }

  private matchesReplaySelection(
    deadLetter: PersistedDeadLetterRecord,
    options: { tenantId?: string; runId?: string } | undefined,
    ids: ReadonlySet<string> | null
  ): boolean {
    if (options?.tenantId && deadLetter.payload.tenantId !== options.tenantId) {
      return false;
    }
    if (options?.runId && deadLetter.runId !== options.runId) {
      return false;
    }
    if (ids && !ids.has(deadLetter.id)) {
      return false;
    }
    return true;
  }

  private restoreDeadLetter(deadLetter: PersistedDeadLetterRecord): void {
    this.pending.push({
      id: deadLetter.originalId,
      createdAt: this.nowIsoUtc(),
      idempotencyKey: deadLetter.payload.idempotencyKey,
      payload: deadLetter.payload,
      attempts: 0,
      shardId: deadLetter.shardId,
    });
  }

  private collectReplayDeadLetterIndexes(
    limit: number,
    options: ReplayDeadLetterOptions | undefined,
    ids: ReadonlySet<string> | null
  ): number[] {
    const indexes: number[] = [];

    for (
      let index = this.deadLetters.length - 1;
      index >= 0 && indexes.length < limit;
      index -= 1
    ) {
      const deadLetter = this.deadLetters[index];
      if (!deadLetter || !this.matchesReplaySelection(deadLetter, options, ids)) {
        continue;
      }
      indexes.push(index);
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

  async enqueueTx(_runId: string, events: EventEnvelope[]): Promise<void> {
    for (const event of events) {
      this.counter += 1;
      this.pending.push({
        id: `outbox_${this.counter}`,
        createdAt: this.nowIsoUtc(),
        idempotencyKey: event.idempotencyKey,
        payload: event,
        attempts: 0,
        shardId: resolveShardId(event.runId, this.shardCount),
      });
    }
  }

  async listPending(limit: number): Promise<OutboxRecord[]> {
    return this.listPendingForClaim(limit);
  }

  async listPendingForClaim(
    limit: number,
    selection?: OutboxClaimSelection
  ): Promise<OutboxRecord[]> {
    const boundedLimit = Math.max(0, limit);
    if (boundedLimit === 0) {
      return [];
    }
    const selectedShardIds = selection?.shardIds;
    const ownedShardIds =
      selectedShardIds === undefined ? null : new Set(selectedShardIds.map(Number));
    if (ownedShardIds?.size === 0) {
      return [];
    }

    const nowMs = this.nowMs();
    const blockedRunIds = new Set(this.deadLetters.map((record) => record.runId));
    const headRunSeqByRunId = this.buildHeadRunSeqByRunId(blockedRunIds);
    const eligible = this.pending.filter(
      (record) =>
        (ownedShardIds?.has(record.shardId) ?? true) &&
        this.isPendingRecordEligible(record, blockedRunIds, headRunSeqByRunId, nowMs)
    );

    eligible.sort(InMemoryOutboxState.compareEligibleRecords);

    return eligible.slice(0, boundedLimit).map(stripPersistedShardId);
  }

  async markDelivered(ids: string[]): Promise<void> {
    const deliveredIds = new Set(ids);
    for (let index = this.pending.length - 1; index >= 0; index -= 1) {
      const record = this.pending[index];
      if (record && deliveredIds.has(record.id)) {
        this.pending.splice(index, 1);
      }
    }
  }

  async markFailed(id: string, error: string): Promise<void> {
    const index = this.pending.findIndex((record) => record.id === id);
    if (index === -1) return;
    const record = this.pending[index];
    if (!record) return;
    record.attempts += 1;
    record.lastError = error;

    if (record.attempts >= MAX_OUTBOX_ATTEMPTS) {
      this.pending.splice(index, 1);
      this.deadLetters.push({
        id: `dl_${record.id}`,
        originalId: record.id,
        runId: record.payload.runId,
        payload: record.payload,
        lastError: error,
        deadLetteredAt: this.nowIsoUtc(),
        shardId: record.shardId,
      });
      return;
    }

    record.nextAttemptAt = this.computeNextAttemptAtIso(record.attempts);
  }

  async hasPendingRetries(selection?: OutboxClaimSelection): Promise<boolean> {
    const selectedShardIds = selection?.shardIds;
    const ownedShardIds =
      selectedShardIds === undefined ? null : new Set(selectedShardIds.map(Number));
    if (ownedShardIds?.size === 0) {
      return false;
    }

    return this.pending.some(
      (record) => (ownedShardIds?.has(record.shardId) ?? true) && record.attempts > 0
    );
  }

  async listDeadLetter(limit: number, tenantId: string): Promise<DeadLetterRecord[]> {
    return this.deadLetters
      .filter((r) => r.payload.tenantId === tenantId)
      .slice(0, limit)
      .map(stripPersistedDeadLetterShardId);
  }

  async replayDeadLetters(options: ReplayDeadLetterOptions): Promise<number> {
    const limit = Math.max(0, options.limit ?? Number.MAX_SAFE_INTEGER);
    if (limit === 0) {
      return 0;
    }

    const ids = options.ids ? new Set(options.ids) : null;
    const indexes = this.collectReplayDeadLetterIndexes(limit, options, ids);
    return this.replayDeadLettersAtIndexes(indexes);
  }
}

function resolveShardId(runId: string, shardCount: number): number {
  const normalizedShardCount = Math.max(1, shardCount);
  const hash = createHash('md5').update(runId, 'utf8').digest('hex').slice(0, 16);
  const shardCountBigInt = BigInt(normalizedShardCount);
  let hashValue = BigInt(`0x${hash}`);
  if (hashValue >= SIGNED_BIGINT_HIGH_BIT) {
    hashValue -= UINT64_MODULUS;
  }
  return Number(((hashValue % shardCountBigInt) + shardCountBigInt) % shardCountBigInt);
}

const SIGNED_BIGINT_HIGH_BIT = 1n << 63n;
const UINT64_MODULUS = 1n << 64n;

function stripPersistedShardId(record: PersistedOutboxRecord): OutboxRecord {
  const { shardId: _shardId, ...outboxRecord } = record;
  return outboxRecord;
}

function stripPersistedDeadLetterShardId(record: PersistedDeadLetterRecord): DeadLetterRecord {
  const { shardId: _shardId, ...deadLetterRecord } = record;
  return deadLetterRecord;
}
