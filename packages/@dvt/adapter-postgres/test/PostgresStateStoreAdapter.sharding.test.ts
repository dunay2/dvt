import { describe, expect, it } from 'vitest';

import { normalizeOutboxClaimTimeoutMs } from '../src/PostgresOutboxStore.js';
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

    if (statement.includes('snapshot_work_queue') && statement.includes('RETURNING q.run_id')) {
      return {
        rows: [
          { run_id: 'run-1', tenant_id: 'tenant-1', claim_token: '2026-03-12T00:00:00.000000Z' },
        ],
        rowCount: 1,
      };
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
    expect(claimQuery?.sql).toContain(
      "o.claimed_at < ($2::timestamptz - ($3::bigint * INTERVAL '1 millisecond'))"
    );
    expect(claimQuery?.sql).toContain('o.shard_id = ANY($4::int[])');
    expect(claimQuery?.params).toEqual([10, '2026-03-12T00:00:00.000Z', 300_000, [1, 3]]);
  });

  it('uses a configured claim timeout when calculating pending-claim thresholds', async () => {
    const client = new RecordingPoolClient();
    const adapter = new PostgresStateStoreAdapter({
      pool: {
        connect: async () => client,
      } as never,
      assumeSchemaReady: true,
      now: () => '2026-03-12T00:00:00.000Z',
      outboxClaimTimeoutMs: 90_000,
    });

    await adapter.listPendingForClaim(10);

    const claimQuery = client.queries.find((entry) => entry.sql.includes('WITH picked AS'));
    expect(claimQuery).toBeDefined();
    expect(claimQuery?.params).toEqual([10, '2026-03-12T00:00:00.000Z', 90_000]);
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

  it('quotes mixed-case schemas in stale snapshot probing', async () => {
    const client = new RecordingPoolClient();
    const adapter = new PostgresStateStoreAdapter({
      pool: {
        connect: async () => client,
      } as never,
      schema: 'DvtOps',
      assumeSchemaReady: true,
    });

    await adapter.listStaleSnapshotRuns(5);

    const staleQuery = client.queries.find((entry) =>
      entry.sql.includes('ORDER BY m.created_at ASC')
    );
    expect(staleQuery).toBeDefined();
    expect(staleQuery?.sql).toContain('FROM "DvtOps".run_metadata m');
    expect(staleQuery?.sql).toContain('LEFT JOIN "DvtOps".run_snapshots s ON s.run_id = m.run_id');
    expect(staleQuery?.sql).toContain('LEFT JOIN "DvtOps".run_event_heads h');
    expect(staleQuery?.sql).toContain('h.run_id = m.run_id');
    expect(staleQuery?.sql).toContain('h.tenant_id = m.tenant_id');
    expect(staleQuery?.sql).toContain('h.run_id IS NULL');
    expect(staleQuery?.sql).toContain('AND EXISTS (');
    expect(staleQuery?.params).toEqual([5]);
  });
  it('supports tenant-scoped staleness checks for a single run', async () => {
    const client = new RecordingPoolClient();
    const adapter = new PostgresStateStoreAdapter({
      pool: {
        connect: async () => client,
      } as never,
      schema: 'DvtOps',
      assumeSchemaReady: true,
    });

    await adapter.isSnapshotStale('tenant-1', 'run-1');

    const staleQuery = client.queries.find((entry) => entry.sql.includes('AS is_snapshot_stale'));
    expect(staleQuery).toBeDefined();
    expect(staleQuery?.sql).toContain('FROM "DvtOps".run_metadata m');
    expect(staleQuery?.sql).toContain('WHERE m.tenant_id = $1');
    expect(staleQuery?.sql).toContain('AND m.run_id = $2');
    expect(staleQuery?.params).toEqual(['tenant-1', 'run-1']);
  });
  it('claims snapshot work queue rows with mixed-case schema quoting', async () => {
    const client = new RecordingPoolClient();
    const adapter = new PostgresStateStoreAdapter({
      pool: {
        connect: async () => client,
      } as never,
      schema: 'DvtOps',
      assumeSchemaReady: true,
    });

    const result = await adapter.claimSnapshotWork(7);

    expect(result).toEqual([
      { runId: 'run-1', tenantId: 'tenant-1', claimToken: '2026-03-12T00:00:00.000000Z' },
    ]);
    const claimQuery = client.queries.find(
      (entry) =>
        entry.sql.includes('FROM "DvtOps".snapshot_work_queue') &&
        entry.sql.includes('FOR UPDATE SKIP LOCKED')
    );
    expect(claimQuery).toBeDefined();
    expect(claimQuery?.sql).toContain('UPDATE "DvtOps".snapshot_work_queue q');
    expect(claimQuery?.sql).toContain('LEFT JOIN "DvtOps".run_snapshots s ON s.run_id = q.run_id');
    expect(claimQuery?.params).toEqual([7, 300000]);
  });
  it('can complete and fail claimed snapshot work entries', async () => {
    const client = new RecordingPoolClient();
    const adapter = new PostgresStateStoreAdapter({
      pool: {
        connect: async () => client,
      } as never,
      schema: 'DvtOps',
      assumeSchemaReady: true,
    });

    await adapter.completeSnapshotWork('tenant-1', 'run-1', '2026-03-12T00:00:00.000000Z');
    await adapter.failSnapshotWork(
      'tenant-1',
      'run-1',
      1500,
      'rebuild failed',
      '2026-03-12T00:00:00.000000Z'
    );

    const completeQuery = client.queries.find((entry) =>
      entry.sql.includes('DELETE FROM "DvtOps".snapshot_work_queue q')
    );
    expect(completeQuery).toBeDefined();
    expect(completeQuery?.params).toEqual(['tenant-1', 'run-1', '2026-03-12T00:00:00.000000Z']);
    expect(completeQuery?.sql).toContain('WITH deleted AS (');
    expect(completeQuery?.sql).toContain('SET claimed_at = NULL');
    expect(completeQuery?.sql).toContain('next_attempt_at = NULL');
    expect(completeQuery?.sql).toContain('last_error = NULL');
    expect(completeQuery?.sql).toContain('NOT EXISTS (SELECT 1 FROM deleted)');
    expect(completeQuery?.sql).toContain(
      `to_char(q.claimed_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') = $3`
    );

    const failQuery = client.queries.find(
      (entry) =>
        entry.sql.includes('attempts = attempts + 1') && entry.sql.includes('last_error = $4')
    );
    expect(failQuery).toBeDefined();
    expect(failQuery?.params).toEqual([
      'tenant-1',
      'run-1',
      1500,
      'rebuild failed',
      '2026-03-12T00:00:00.000000Z',
    ]);
    expect(failQuery?.sql).toContain(
      `to_char(claimed_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') = $5`
    );
  });

  it('normalizes snapshot work fail error payload before writing', async () => {
    const client = new RecordingPoolClient();
    const adapter = new PostgresStateStoreAdapter({
      pool: {
        connect: async () => client,
      } as never,
      schema: 'DvtOps',
      assumeSchemaReady: true,
    });

    await adapter.failSnapshotWork('tenant-1', 'run-1', 1500, '   ', '2026-03-12T00:00:00.000000Z');

    const failQuery = client.queries.find(
      (entry) =>
        entry.sql.includes('attempts = attempts + 1') && entry.sql.includes('last_error = $4')
    );
    expect(failQuery).toBeDefined();
    expect(failQuery?.params).toEqual([
      'tenant-1',
      'run-1',
      1500,
      'unknown_error',
      '2026-03-12T00:00:00.000000Z',
    ]);
  });

  it('rejects invalid snapshot work retry delay values', async () => {
    const adapter = new PostgresStateStoreAdapter({
      pool: {
        connect: async () => {
          throw new Error('connect should not be reached');
        },
      } as never,
      assumeSchemaReady: true,
    });

    await expect(
      adapter.failSnapshotWork('tenant-1', 'run-1', -1, 'boom', '2026-03-12T00:00:00.000000Z')
    ).rejects.toThrow('INVALID_SNAPSHOT_WORK_RETRY_DELAY_MS');
    await expect(
      adapter.failSnapshotWork(
        'tenant-1',
        'run-1',
        Number.NaN,
        'boom',
        '2026-03-12T00:00:00.000000Z'
      )
    ).rejects.toThrow('INVALID_SNAPSHOT_WORK_RETRY_DELAY_MS');
    await expect(
      adapter.failSnapshotWork(
        'tenant-1',
        'run-1',
        Number.POSITIVE_INFINITY,
        'boom',
        '2026-03-12T00:00:00.000000Z'
      )
    ).rejects.toThrow('INVALID_SNAPSHOT_WORK_RETRY_DELAY_MS');
  });

  it('rejects empty snapshot work claim token values', async () => {
    const adapter = new PostgresStateStoreAdapter({
      pool: {
        connect: async () => {
          throw new Error('connect should not be reached');
        },
      } as never,
      assumeSchemaReady: true,
    });

    await expect(adapter.completeSnapshotWork('tenant-1', 'run-1', '   ')).rejects.toThrow(
      'INVALID_SNAPSHOT_WORK_CLAIM_TOKEN'
    );
    await expect(
      adapter.failSnapshotWork('tenant-1', 'run-1', 1000, 'boom', '   ')
    ).rejects.toThrow('INVALID_SNAPSHOT_WORK_CLAIM_TOKEN');
  });

  it('rejects invalid outbox claim timeout values', () => {
    expect(normalizeOutboxClaimTimeoutMs(undefined)).toBe(300_000);
    expect(normalizeOutboxClaimTimeoutMs(86_400_000)).toBe(86_400_000);
    expect(() => normalizeOutboxClaimTimeoutMs(0)).toThrow('INVALID_OUTBOX_CLAIM_TIMEOUT_MS');
    expect(() => normalizeOutboxClaimTimeoutMs(-1)).toThrow('INVALID_OUTBOX_CLAIM_TIMEOUT_MS');
    expect(() => normalizeOutboxClaimTimeoutMs(90.5)).toThrow('INVALID_OUTBOX_CLAIM_TIMEOUT_MS');
    expect(() => normalizeOutboxClaimTimeoutMs(Number.NaN)).toThrow(
      'INVALID_OUTBOX_CLAIM_TIMEOUT_MS'
    );
    expect(() => normalizeOutboxClaimTimeoutMs(Number.POSITIVE_INFINITY)).toThrow(
      'INVALID_OUTBOX_CLAIM_TIMEOUT_MS'
    );
  });

  it('rejects invalid outbox claim timeout values at adapter construction time', () => {
    expect(
      () =>
        new PostgresStateStoreAdapter({
          pool: {
            connect: async () => {
              throw new Error('connect should not be reached');
            },
          } as never,
          assumeSchemaReady: true,
          outboxClaimTimeoutMs: 90.5,
        })
    ).toThrow('INVALID_OUTBOX_CLAIM_TIMEOUT_MS');
  });
});
