import type {
  DeadLetterRecord,
  EventEnvelope as RunEventPersisted,
  OutboxRecord,
} from '@dvt/contracts';

import type { IEventBus, IOutboxStorage } from '../../src/contracts.js';
import { InMemoryOutboxStorage } from '../../src/testing/InMemoryOutboxStorage.js';
import { resolveOutboxShardId } from '../../src/testing/outboxSharding.js';

type ReplayDeadLetterOptions = Parameters<IOutboxStorage['replayDeadLetters']>[0];

export function makeEvent(
  id: string,
  runId = 'run-1',
  runSeq = 1,
  tenantId = 't1'
): RunEventPersisted {
  return {
    eventId: `evt-${id}`,
    eventType: 'RunQueued',
    runId,
    tenantId,
    projectId: 'p1',
    environmentId: 'dev',
    planId: 'plan-1',
    planVersion: '1.0.0',
    logicalAttemptId: 1,
    engineAttemptId: 1,
    emittedAt: '2026-02-27T00:00:00.000Z',
    idempotencyKey: `k-${id}`,
    runSeq,
    persistedAt: '2026-02-27T00:00:00.000Z',
  };
}

export class CapturingBus implements IEventBus {
  public readonly published: RunEventPersisted[] = [];

  async publish(events: RunEventPersisted[]): Promise<void> {
    this.published.push(...events);
  }
}

export class FailFirstBus implements IEventBus {
  public calls = 0;
  public readonly published: RunEventPersisted[] = [];

  async publish(events: RunEventPersisted[]): Promise<void> {
    this.calls += 1;
    if (this.calls === 1) {
      throw new Error('synthetic bus failure');
    }
    this.published.push(...events);
  }
}

export class FailFirstMarkDeliveredStorage implements IOutboxStorage {
  private failed = false;

  constructor(private readonly inner: InMemoryOutboxStorage) {}

  async enqueueTx(runId: string, events: RunEventPersisted[]): Promise<void> {
    await this.inner.enqueueTx(runId, events);
  }

  async listPending(limit: number): Promise<OutboxRecord[]> {
    return this.inner.listPending(limit);
  }

  async markDelivered(ids: string[]): Promise<void> {
    if (!this.failed) {
      this.failed = true;
      throw new Error('synthetic ack failure');
    }
    await this.inner.markDelivered(ids);
  }

  async markFailed(id: string, error: string): Promise<void> {
    await this.inner.markFailed(id, error);
  }

  async hasPendingRetries(selection?: { shardIds?: readonly number[] }): Promise<boolean> {
    return (await this.inner.hasPendingRetries?.(selection)) ?? false;
  }

  async listDeadLetter(limit: number, tenantId: string): Promise<DeadLetterRecord[]> {
    return this.inner.listDeadLetter(limit, tenantId);
  }

  async replayDeadLetters(options: ReplayDeadLetterOptions): Promise<number> {
    return this.inner.replayDeadLetters(options);
  }
}

export function makeAlwaysFailBus(message = 'always fail'): IEventBus {
  return {
    publish: async () => {
      throw new Error(message);
    },
  };
}

export function findRunIdForShard(targetShardId: number, shardCount: number): string {
  for (let index = 0; index < 256; index += 1) {
    const candidate = `run-shard-${targetShardId}-${index}`;
    if (resolveOutboxShardId(candidate, shardCount) === targetShardId) {
      return candidate;
    }
  }

  throw new Error(`Unable to find run id for shard ${targetShardId}`);
}
