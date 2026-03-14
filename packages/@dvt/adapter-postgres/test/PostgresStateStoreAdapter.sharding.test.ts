import { describe, expect, it } from 'vitest';

import { PostgresStateStoreAdapter } from '../src/PostgresStateStoreAdapter.js';

class RecordingPoolClient {
  public readonly queries: Array<{ sql: string; params?: unknown[] }> = [];
  public releaseCalls = 0;

  async query(sql: string, params?: unknown[]): Promise<{ rows: unknown[]; rowCount: number }> {
    this.queries.push({ sql, params });
    const statement = sql.trim();
    if (
      statement === 'BEGIN' ||
      statement === 'COMMIT' ||
      statement === 'ROLLBACK' ||
      statement.startsWith('SET LOCAL statement_timeout')
    ) {
      return { rows: [], rowCount: 0 };
    }

    return {
      rows: [
        {
          id: 'outbox_1',
          created_at: '2026-03-12T00:00:00.000Z',
          idempotency_key: 'key-1',
          payload: {
            eventId: 'evt-1',
            eventType: 'RunQueued',
            runId: 'run-1',
            tenantId: 'tenant-1',
            projectId: 'project-1',
            environmentId: 'dev',
            planId: 'plan-1',
            planVersion: '1.0.0',
            logicalAttemptId: 1,
            engineAttemptId: 1,
            emittedAt: '2026-03-12T00:00:00.000Z',
            idempotencyKey: 'key-1',
            runSeq: 1,
            persistedAt: '2026-03-12T00:00:00.000Z',
          },
          attempts: 0,
          last_error: null,
          next_attempt_at: null,
        },
      ],
      rowCount: 1,
    };
  }

  release(): void {
    this.releaseCalls += 1;
  }
}

describe('PostgresStateStoreAdapter shard-aware claiming', () => {
  it('pushes owned shard ids into the pending-claim SQL filter', async () => {
    const client = new RecordingPoolClient();
    const adapter = new PostgresStateStoreAdapter({
      pool: {
        connect: async () => client,
      } as never,
      assumeSchemaReady: true,
      now: () => '2026-03-12T00:00:00.000Z',
    });

    const result = await adapter.listPendingForClaim(10, { shardIds: [3, 1, 3] });

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('outbox_1');

    const claimQuery = client.queries.find((entry) => entry.sql.includes('WITH picked AS'));
    expect(claimQuery).toBeDefined();
    expect(claimQuery?.sql).toContain('o.shard_id = ANY($3::int[])');
    expect(claimQuery?.params).toEqual([10, '2026-03-12T00:00:00.000Z', [1, 3]]);
  });

  it('returns early when the owned shard list is empty', async () => {
    let connectCalls = 0;
    const adapter = new PostgresStateStoreAdapter({
      pool: {
        connect: async () => {
          connectCalls += 1;
          throw new Error('connect should not be reached for an empty shard selection');
        },
      } as never,
      assumeSchemaReady: true,
    });

    await expect(adapter.listPendingForClaim(10, { shardIds: [] })).resolves.toEqual([]);
    expect(connectCalls).toBe(0);
  });

  it('pushes owned shard ids into retry-backlog probing', async () => {
    const client = new RecordingPoolClient();
    const adapter = new PostgresStateStoreAdapter({
      pool: {
        connect: async () => client,
      } as never,
      assumeSchemaReady: true,
      now: () => '2026-03-12T00:00:00.000Z',
    });

    await adapter.hasPendingRetries({ shardIds: [2, 0, 2] });

    const retryQuery = client.queries.find((entry) => entry.sql.includes('AS has_pending_retries'));
    expect(retryQuery).toBeDefined();
    expect(retryQuery?.sql).toContain('shard_id = ANY($1::int[])');
    expect(retryQuery?.params).toEqual([[0, 2]]);
  });
});
