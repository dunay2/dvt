import { describe, expect, it } from 'vitest';

import { normalizeLineageOutboxClaimTimeoutMs } from '../src/lineageOutboxStorePolicy.js';

import {
  createRecordingLineageOutboxStore,
  NOW,
  makePayload,
  RecordingClient,
} from './helpers/lineageOutboxUnitSupport.js';

describe('PostgresLineageOutboxStore pending queue behavior', () => {
  it('listPending returns empty result without hitting storage when limit is zero', async () => {
    const client = new RecordingClient();
    const store = createRecordingLineageOutboxStore(client);

    const records = await store.listPending(0);

    expect(records).toEqual([]);
    expect(client.queries).toHaveLength(0);
  });

  it('listPending rejects invalid limits', async () => {
    const client = new RecordingClient();
    const store = createRecordingLineageOutboxStore(client);

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
        created_at: NOW,
      },
    ]);

    const store = createRecordingLineageOutboxStore(client);

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
        createdAt: NOW,
      },
    ]);
    expect(client.queries).toHaveLength(1);
    const query = client.queries[0];
    expect(query?.sql).toContain("status = 'pending'");
    expect(query?.sql).toContain("o.status = 'claimed'");
    expect(query?.sql).toContain(
      "o.claimed_at < ($2::timestamptz - ($3::bigint * INTERVAL '1 millisecond'))"
    );
    expect(query?.sql).toContain(
      '(o.next_attempt_at IS NULL OR o.next_attempt_at <= $2::timestamptz)'
    );
    expect(query?.sql).toContain('o.claimed_at IS NULL');
    expect(query?.sql).toContain('FOR UPDATE SKIP LOCKED');
    expect(query?.sql).toContain('SET claimed_at = $2::timestamptz');
    expect(query?.params).toEqual([25, NOW, 60_000]);
  });

  it('countPending considers expired claimed records as pending work', async () => {
    const client = new RecordingClient();
    client.enqueueRows([{ pending_count: 3 }]);
    const store = createRecordingLineageOutboxStore(client);

    const pendingCount = await store.countPending();

    expect(pendingCount).toBe(3);
    expect(client.queries).toHaveLength(1);
    const query = client.queries[0];
    expect(query?.sql).toContain("o.status = 'pending'");
    expect(query?.sql).toContain("o.status = 'claimed'");
    expect(query?.sql).toContain(
      "o.claimed_at < ($1::timestamptz - ($2::bigint * INTERVAL '1 millisecond'))"
    );
    expect(query?.params).toEqual([NOW, 60_000]);
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
        created_at: NOW,
      },
    ]);

    const store = createRecordingLineageOutboxStore(client);

    const [record] = await store.listPending(10);

    expect(record).toMatchObject({
      id: 'lox-evt-null-error',
      tenantId: 'tenant-a',
      runId: 'run-1',
      eventType: 'StepStarted',
      attempts: 0,
      createdAt: NOW,
    });
    expect(record).not.toHaveProperty('lastError');
  });

  it('markDelivered no-ops when no ids are provided', async () => {
    const client = new RecordingClient();
    const store = createRecordingLineageOutboxStore(client);

    await store.markDelivered([]);

    expect(client.queries).toHaveLength(0);
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
