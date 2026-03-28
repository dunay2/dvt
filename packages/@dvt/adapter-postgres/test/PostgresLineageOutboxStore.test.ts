import { MAX_LINEAGE_ATTEMPTS } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import {
  normalizeLineageOutboxClaimTimeoutMs,
  PostgresLineageOutboxStore,
} from '../src/PostgresLineageOutboxStore.js';
import type { EventEnvelope } from '../src/types.js';

interface RecordedQuery {
  sql: string;
  params?: readonly unknown[];
}

class RecordingClient {
  readonly queries: RecordedQuery[] = [];
  private readonly rowsByQuery: unknown[][] = [];

  enqueueRows(rows: unknown[]): void {
    this.rowsByQuery.push(rows);
  }

  async query<T = unknown>(
    sql: string,
    params?: readonly unknown[]
  ): Promise<{ rows: T[]; rowCount?: number | null }> {
    this.queries.push({ sql, params });
    const rows = this.rowsByQuery.shift() ?? [];
    return { rows: rows as T[] };
  }
}

function withRecordingClient(client: RecordingClient) {
  return async <T>(fn: (pgClient: RecordingClient) => Promise<T>): Promise<T> => fn(client);
}

const NOW = '2026-03-28T00:00:00.000Z';

function makePayload(eventId: string): EventEnvelope {
  return {
    eventId,
    eventType: 'StepStarted',
    runId: 'run-1',
    emittedAt: '2026-03-28T00:00:00.000Z',
    tenantId: 'tenant-a',
    projectId: 'project-a',
    environmentId: 'dev',
    planId: 'plan-a',
    planVersion: '1.0.0',
    engineAttemptId: 1,
    logicalAttemptId: 1,
    stepId: 'step-a',
    idempotencyKey: `ik-${eventId}`,
    payloadVersion: 1,
    payload: { compiledCodeRef: { storageUri: 's3://bucket/a.sql', sha256: 'x'.repeat(64) } },
    runSeq: 1,
    persistedAt: '2026-03-28T00:00:00.000Z',
  };
}

describe('PostgresLineageOutboxStore', () => {
  it('listPending returns empty result without hitting storage when limit is zero', async () => {
    const client = new RecordingClient();
    const store = new PostgresLineageOutboxStore(
      'dvt',
      () => NOW,
      60_000,
      withRecordingClient(client) as never,
      withRecordingClient(client) as never
    );

    const records = await store.listPending(0);

    expect(records).toEqual([]);
    expect(client.queries).toHaveLength(0);
  });

  it('listPending rejects invalid limits', async () => {
    const client = new RecordingClient();
    const store = new PostgresLineageOutboxStore(
      'dvt',
      () => NOW,
      60_000,
      withRecordingClient(client) as never,
      withRecordingClient(client) as never
    );

    await expect(store.listPending(Number.NaN)).rejects.toThrow('INVALID_LINEAGE_PENDING_LIMIT');
    await expect(store.listPending(-1)).rejects.toThrow('INVALID_LINEAGE_PENDING_LIMIT');
    await expect(store.listPending(1.5)).rejects.toThrow('INVALID_LINEAGE_PENDING_LIMIT');
  });

  it('listPending claims retry-ready rows with SKIP LOCKED and claim timeout gating', async () => {
    const client = new RecordingClient();
    client.enqueueRows([
      {
        id: 'lox-evt-1',
        tenant_id: 'tenant-a',
        run_id: 'run-1',
        event_type: 'StepStarted',
        payload: makePayload('evt-1'),
        attempts: 2,
        last_error: 'temporary failure',
        status: 'pending',
        next_attempt_at: null,
        created_at: '2026-03-28T00:00:00.000Z',
      },
    ]);

    const store = new PostgresLineageOutboxStore(
      'dvt',
      () => NOW,
      60_000,
      withRecordingClient(client) as never,
      withRecordingClient(client) as never
    );

    const records = await store.listPending(25);

    expect(records).toEqual([
      {
        id: 'lox-evt-1',
        tenantId: 'tenant-a',
        runId: 'run-1',
        eventType: 'StepStarted',
        payload: makePayload('evt-1'),
        attempts: 2,
        lastError: 'temporary failure',
        createdAt: '2026-03-28T00:00:00.000Z',
      },
    ]);
    expect(client.queries).toHaveLength(1);
    const query = client.queries[0];
    expect(query?.sql).toContain("status = 'pending'");
    expect(query?.sql).toContain(
      '(o.next_attempt_at IS NULL OR o.next_attempt_at <= $2::timestamptz)'
    );
    expect(query?.sql).toContain('o.claimed_at IS NULL');
    expect(query?.sql).toContain('FOR UPDATE SKIP LOCKED');
    expect(query?.sql).toContain('SET claimed_at = $2::timestamptz');
    expect(query?.params).toEqual([25, NOW, 60_000]);
  });

  it('listPending omits lastError when lineage row has no last_error value', async () => {
    const client = new RecordingClient();
    client.enqueueRows([
      {
        id: 'lox-evt-null-error',
        tenant_id: 'tenant-a',
        run_id: 'run-1',
        event_type: 'StepStarted',
        payload: makePayload('evt-null-error'),
        attempts: 0,
        last_error: null,
        status: 'pending',
        next_attempt_at: null,
        created_at: '2026-03-28T00:00:00.000Z',
      },
    ]);

    const store = new PostgresLineageOutboxStore(
      'dvt',
      () => NOW,
      60_000,
      withRecordingClient(client) as never,
      withRecordingClient(client) as never
    );

    const [record] = await store.listPending(10);

    expect(record).toMatchObject({
      id: 'lox-evt-null-error',
      tenantId: 'tenant-a',
      runId: 'run-1',
      eventType: 'StepStarted',
      attempts: 0,
      createdAt: '2026-03-28T00:00:00.000Z',
    });
    expect(record).not.toHaveProperty('lastError');
  });

  it('markDelivered no-ops when no ids are provided', async () => {
    const client = new RecordingClient();
    const store = new PostgresLineageOutboxStore(
      'dvt',
      () => NOW,
      60_000,
      withRecordingClient(client) as never,
      withRecordingClient(client) as never
    );

    await store.markDelivered([]);

    expect(client.queries).toHaveLength(0);
  });

  it('markFailed increments attempts atomically and schedules exponential backoff', async () => {
    const client = new RecordingClient();
    client.enqueueRows([
      {
        id: 'lox-evt-2',
        tenant_id: 'tenant-a',
        run_id: 'run-1',
        event_type: 'StepStarted',
        payload: makePayload('evt-2'),
        attempts: 3,
      },
    ]);
    const store = new PostgresLineageOutboxStore(
      'dvt',
      () => NOW,
      60_000,
      withRecordingClient(client) as never,
      withRecordingClient(client) as never
    );

    const disposition = await store.markFailed('lox-evt-2', 'sink timeout');

    expect(disposition).toBe('retry_scheduled');
    expect(client.queries).toHaveLength(1);
    const query = client.queries[0];
    expect(query?.sql).toContain('attempts = attempts + 1');
    expect(query?.sql).toContain(`WHEN attempts + 1 >= ${MAX_LINEAGE_ATTEMPTS} THEN NULL`);
    expect(query?.sql).toContain(
      'make_interval(secs => LEAST(60, POWER(2, GREATEST(0, attempts))))'
    );
    expect(query?.sql).toContain('claimed_at = NULL');
    expect(query?.params).toEqual(['lox-evt-2', 'sink timeout', NOW, 60_000]);
  });

  it('markFailed returns not_found when lineage row is already missing', async () => {
    const client = new RecordingClient();
    client.enqueueRows([]);
    const store = new PostgresLineageOutboxStore(
      'dvt',
      () => NOW,
      60_000,
      withRecordingClient(client) as never,
      withRecordingClient(client) as never
    );

    const disposition = await store.markFailed('lox-missing', 'sink timeout');

    expect(disposition).toBe('not_found');
    expect(client.queries).toHaveLength(1);
    expect(client.queries[0]?.sql).toContain('UPDATE "dvt".lineage_outbox');
  });

  it('markFailed dead-letters and removes the row when max attempts is reached', async () => {
    const client = new RecordingClient();
    client.enqueueRows([
      {
        id: 'lox-evt-3',
        tenant_id: 'tenant-a',
        run_id: 'run-1',
        event_type: 'StepStarted',
        payload: makePayload('evt-3'),
        attempts: MAX_LINEAGE_ATTEMPTS,
      },
    ]);

    const store = new PostgresLineageOutboxStore(
      'dvt',
      () => NOW,
      60_000,
      withRecordingClient(client) as never,
      withRecordingClient(client) as never
    );

    const disposition = await store.markFailed('lox-evt-3', 'terminal failure');

    expect(disposition).toBe('dead_lettered');
    expect(client.queries).toHaveLength(3);
    expect(client.queries[1]?.sql).toContain('INSERT INTO "dvt".lineage_dead_letter');
    expect(client.queries[2]?.sql).toContain('DELETE FROM "dvt".lineage_outbox');
  });

  it('listDeadLetter requires tenant scope', async () => {
    const client = new RecordingClient();
    const store = new PostgresLineageOutboxStore(
      'dvt',
      () => NOW,
      60_000,
      withRecordingClient(client) as never,
      withRecordingClient(client) as never
    );

    await expect(store.listDeadLetter(10, '')).rejects.toThrow('TENANT_SCOPE_REQUIRED');
  });

  it('listDeadLetter filters by tenant and maps tenantId', async () => {
    const client = new RecordingClient();
    client.enqueueRows([
      {
        id: 'ldl-1',
        original_id: 'lox-1',
        tenant_id: 'tenant-a',
        run_id: 'run-1',
        event_type: 'StepStarted',
        payload: makePayload('evt-dl'),
        last_error: 'terminal failure',
        dead_lettered_at: NOW,
      },
    ]);
    const store = new PostgresLineageOutboxStore(
      'dvt',
      () => NOW,
      60_000,
      withRecordingClient(client) as never,
      withRecordingClient(client) as never
    );

    const records = await store.listDeadLetter(10, 'tenant-a');

    expect(records).toEqual([
      {
        id: 'ldl-1',
        originalId: 'lox-1',
        tenantId: 'tenant-a',
        runId: 'run-1',
        eventType: 'StepStarted',
        payload: makePayload('evt-dl'),
        lastError: 'terminal failure',
        deadLetteredAt: NOW,
      },
    ]);
    expect(client.queries).toHaveLength(1);
    expect(client.queries[0]?.params).toEqual([10, 'tenant-a']);
  });

  it('listDeadLetter rejects invalid limits', async () => {
    const client = new RecordingClient();
    const store = new PostgresLineageOutboxStore(
      'dvt',
      () => NOW,
      60_000,
      withRecordingClient(client) as never,
      withRecordingClient(client) as never
    );

    await expect(store.listDeadLetter(Number.NaN, 'tenant-a')).rejects.toThrow(
      'INVALID_LINEAGE_DEAD_LETTER_LIMIT'
    );
    await expect(store.listDeadLetter(-1, 'tenant-a')).rejects.toThrow(
      'INVALID_LINEAGE_DEAD_LETTER_LIMIT'
    );
    await expect(store.listDeadLetter(1.5, 'tenant-a')).rejects.toThrow(
      'INVALID_LINEAGE_DEAD_LETTER_LIMIT'
    );
  });
});

describe('normalizeLineageOutboxClaimTimeoutMs', () => {
  it('returns default timeout when value is undefined', () => {
    expect(normalizeLineageOutboxClaimTimeoutMs(undefined)).toBe(300000);
  });

  it('rejects invalid timeout values', () => {
    expect(() => normalizeLineageOutboxClaimTimeoutMs(0)).toThrow(
      'INVALID_LINEAGE_OUTBOX_CLAIM_TIMEOUT_MS'
    );
    expect(() => normalizeLineageOutboxClaimTimeoutMs(-1)).toThrow(
      'INVALID_LINEAGE_OUTBOX_CLAIM_TIMEOUT_MS'
    );
    expect(() => normalizeLineageOutboxClaimTimeoutMs(1.5)).toThrow(
      'INVALID_LINEAGE_OUTBOX_CLAIM_TIMEOUT_MS'
    );
    expect(() => normalizeLineageOutboxClaimTimeoutMs(Number.NaN)).toThrow(
      'INVALID_LINEAGE_OUTBOX_CLAIM_TIMEOUT_MS'
    );
    expect(() => normalizeLineageOutboxClaimTimeoutMs(Number.POSITIVE_INFINITY)).toThrow(
      'INVALID_LINEAGE_OUTBOX_CLAIM_TIMEOUT_MS'
    );
  });
});
