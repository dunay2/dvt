import { PostgresStateStoreAdapter } from '@dvt/adapter-postgres';
import type { EventEnvelope as RunEventPersisted } from '@dvt/contracts';
import { MAX_OUTBOX_ATTEMPTS, type OutboxRecord } from '@dvt/delivery';

import { closePgPool } from '../../../src/db/pool.js';

import { cloneEvent } from './standaloneCanaryEventSupport.js';

export interface PostgresOutboxFixture {
  seedPending(events: readonly RunEventPersisted[]): Promise<void>;
}

export interface PatchedOutboxFixtureOptions {
  retryDelayMs?: number;
  failMarkDeliveredRunSeqsOnce?: number[];
}

interface FakeOutboxState {
  nextId: number;
  pending: OutboxRecord[];
  deadLetters: string[];
  failMarkDeliveredRunSeqsOnce: Set<number>;
}

export async function withPatchedPostgresOutboxFixture<T>(
  options: PatchedOutboxFixtureOptions | ((fixture: PostgresOutboxFixture) => Promise<T>),
  run?: (fixture: PostgresOutboxFixture) => Promise<T>
): Promise<T> {
  await closePgPool();

  const resolvedRun = typeof options === 'function' ? options : run;
  if (!resolvedRun) {
    throw new Error('expected a fixture callback');
  }

  const retryDelayMs = typeof options === 'function' ? 60_000 : (options.retryDelayMs ?? 60_000);
  const failMarkDeliveredRunSeqsOnce =
    typeof options === 'function' ? [] : (options.failMarkDeliveredRunSeqsOnce ?? []);
  const state: FakeOutboxState = {
    nextId: 1,
    pending: [],
    deadLetters: [],
    failMarkDeliveredRunSeqsOnce: new Set(failMarkDeliveredRunSeqsOnce),
  };
  const originalListPending = PostgresStateStoreAdapter.prototype.listPending;
  const originalListPendingForClaim = PostgresStateStoreAdapter.prototype.listPendingForClaim;
  const originalMarkDelivered = PostgresStateStoreAdapter.prototype.markDelivered;
  const originalMarkFailed = PostgresStateStoreAdapter.prototype.markFailed;
  const originalHasPendingRetries = PostgresStateStoreAdapter.prototype.hasPendingRetries;

  PostgresStateStoreAdapter.prototype.listPending = async function listPending(
    limit: number
  ): Promise<OutboxRecord[]> {
    return listEligiblePendingRecords(state, limit, Date.now()).map(cloneOutboxRecord);
  };
  PostgresStateStoreAdapter.prototype.listPendingForClaim = async function listPendingForClaim(
    limit: number
  ): Promise<OutboxRecord[]> {
    return listEligiblePendingRecords(state, limit, Date.now()).map(cloneOutboxRecord);
  };

  PostgresStateStoreAdapter.prototype.markDelivered = async function markDelivered(
    ids: string[]
  ): Promise<void> {
    const failingRecord = state.pending.find(
      (record) =>
        ids.includes(record.id) && state.failMarkDeliveredRunSeqsOnce.has(record.payload.runSeq)
    );
    if (failingRecord) {
      state.failMarkDeliveredRunSeqsOnce.delete(failingRecord.payload.runSeq);
      throw new Error(`synthetic ack failure for runSeq ${failingRecord.payload.runSeq}`);
    }

    state.pending = state.pending.filter((record) => !ids.includes(record.id));
  };

  PostgresStateStoreAdapter.prototype.markFailed = async function markFailed(
    id: string,
    error: string
  ): Promise<void> {
    const record = state.pending.find((candidate) => candidate.id === id);
    if (!record) {
      return;
    }

    record.attempts += 1;
    record.lastError = error;

    if (record.attempts >= MAX_OUTBOX_ATTEMPTS) {
      state.pending = state.pending.filter((candidate) => candidate.id !== id);
      state.deadLetters.push(record.payload.runId);
      return;
    }

    record.nextAttemptAt = new Date(Date.now() + retryDelayMs).toISOString();
  };

  PostgresStateStoreAdapter.prototype.hasPendingRetries =
    async function hasPendingRetries(): Promise<boolean> {
      return state.pending.some((record) => record.attempts > 0);
    };

  try {
    return await resolvedRun({
      seedPending: async (events) => {
        for (const event of events) {
          state.pending.push({
            id: `outbox_${state.nextId}`,
            createdAt: event.persistedAt,
            idempotencyKey: event.idempotencyKey,
            payload: cloneEvent(event),
            attempts: 0,
          });
          state.nextId += 1;
        }
      },
    });
  } finally {
    PostgresStateStoreAdapter.prototype.listPending = originalListPending;
    PostgresStateStoreAdapter.prototype.listPendingForClaim = originalListPendingForClaim;
    PostgresStateStoreAdapter.prototype.markDelivered = originalMarkDelivered;
    PostgresStateStoreAdapter.prototype.markFailed = originalMarkFailed;
    PostgresStateStoreAdapter.prototype.hasPendingRetries = originalHasPendingRetries;
    await closePgPool();
  }
}

function listEligiblePendingRecords(
  state: FakeOutboxState,
  limit: number,
  nowMs: number
): OutboxRecord[] {
  const blockedRunIds = new Set(state.deadLetters);
  const headRunSeqByRunId = buildHeadRunSeqByRunId(state.pending, blockedRunIds);

  return state.pending
    .filter((record) => {
      if (blockedRunIds.has(record.payload.runId)) {
        return false;
      }

      if (headRunSeqByRunId.get(record.payload.runId) !== record.payload.runSeq) {
        return false;
      }

      if (!record.nextAttemptAt) {
        return true;
      }

      const nextAttemptAtMs = Date.parse(record.nextAttemptAt);
      return Number.isFinite(nextAttemptAtMs) ? nextAttemptAtMs <= nowMs : true;
    })
    .sort(compareOutboxRecords)
    .slice(0, Math.max(0, limit));
}

function buildHeadRunSeqByRunId(
  pending: readonly OutboxRecord[],
  blockedRunIds: ReadonlySet<string>
): Map<string, number> {
  const headRunSeqByRunId = new Map<string, number>();

  for (const record of pending) {
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

function compareOutboxRecords(a: OutboxRecord, b: OutboxRecord): number {
  const createdAtDiff = Date.parse(a.createdAt) - Date.parse(b.createdAt);
  if (createdAtDiff !== 0) {
    return createdAtDiff;
  }
  return a.payload.runSeq - b.payload.runSeq;
}

function cloneOutboxRecord(record: OutboxRecord): OutboxRecord {
  return {
    ...record,
    payload: cloneEvent(record.payload),
  };
}
