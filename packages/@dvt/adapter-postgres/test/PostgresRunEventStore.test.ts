import { describe, expect, it } from 'vitest';

import { PostgresRunEventStore } from '../src/PostgresRunEventStore.js';
import { RUN_EVENT_STORE_ERROR_CODE } from '../src/runEventStoreErrors.js';
import type { EventEnvelope, EventInput } from '../src/types.js';

class InMemorySqlExecutor {
  private readonly byIdempotency = new Map<string, EventEnvelope>();
  private readonly ordered: EventEnvelope[] = [];
  private maxRunSeq = 0;

  async query<T = unknown>(
    text: string,
    params?: readonly unknown[]
  ): Promise<{ rows: T[]; rowCount?: number | null }> {
    if (text.includes('pg_advisory_xact_lock')) {
      return { rows: [] };
    }

    if (text.includes('COALESCE(MAX(run_seq), 0) AS max_seq')) {
      return { rows: [{ max_seq: this.maxRunSeq } as T] };
    }

    if (text.includes('INSERT INTO') && text.includes('run_events')) {
      const idempotencyKey = String(params?.[13]);
      const payload = JSON.parse(String(params?.[14])) as EventEnvelope;
      if (this.byIdempotency.has(idempotencyKey)) {
        return { rows: [], rowCount: 0 };
      }
      this.byIdempotency.set(idempotencyKey, payload);
      this.ordered.push(payload);
      this.maxRunSeq = Math.max(this.maxRunSeq, payload.runSeq);
      return { rows: [{ payload } as T], rowCount: 1 };
    }

    if (text.includes('WHERE run_id = $1 AND idempotency_key = $2')) {
      const idempotencyKey = String(params?.[1]);
      const payload = this.byIdempotency.get(idempotencyKey);
      return { rows: payload ? ([{ payload }] as T[]) : [] };
    }

    return { rows: [] };
  }
}

function makeEvent(
  overrides: Partial<EventInput> & { runId: string; idempotencyKey: string }
): EventInput {
  return {
    eventId: overrides.idempotencyKey,
    eventType: overrides.eventType ?? 'RunStarted',
    runId: overrides.runId,
    emittedAt: overrides.emittedAt ?? '2026-02-22T00:00:00.000Z',
    tenantId: overrides.tenantId ?? 'tenant-a',
    projectId: overrides.projectId ?? 'project-a',
    environmentId: overrides.environmentId ?? 'env-a',
    planId: overrides.planId ?? 'plan-a',
    planVersion: overrides.planVersion ?? '1.0.0',
    engineAttemptId: overrides.engineAttemptId ?? 1,
    logicalAttemptId: overrides.logicalAttemptId ?? 1,
    idempotencyKey: overrides.idempotencyKey,
    payloadVersion: 1,
  };
}

async function unusedWithClient<T>(_fn: (client: never) => Promise<T>): Promise<T> {
  throw new Error('unused_with_client');
}

describe('PostgresRunEventStore append invariants', () => {
  it('throws typed stable error when event runId mismatches target runId', async () => {
    const store = new PostgresRunEventStore(
      'dvt',
      () => '2026-02-22T00:00:00.000Z',
      unusedWithClient
    );
    const executor = new InMemorySqlExecutor();

    await expect(
      store.append(executor, 'tenant-a', 'run-a', [
        makeEvent({ runId: 'run-b', idempotencyKey: 'run-b:started' }),
      ])
    ).rejects.toMatchObject({
      name: 'InvalidRunEventEnvelopeError',
      code: RUN_EVENT_STORE_ERROR_CODE.INVALID_EVENT_ENVELOPE,
    });
  });

  it('throws typed stable error when event tenantId mismatches target tenantId', async () => {
    const store = new PostgresRunEventStore(
      'dvt',
      () => '2026-02-22T00:00:00.000Z',
      unusedWithClient
    );
    const executor = new InMemorySqlExecutor();

    await expect(
      store.append(executor, 'tenant-a', 'run-a', [
        makeEvent({ runId: 'run-a', tenantId: 'tenant-b', idempotencyKey: 'run-a:started' }),
      ])
    ).rejects.toMatchObject({
      name: 'InvalidRunEventTenantError',
      code: RUN_EVENT_STORE_ERROR_CODE.INVALID_EVENT_TENANT,
    });
  });

  it('does not consume runSeq slots for deduped entries in the same append flow', async () => {
    const store = new PostgresRunEventStore(
      'dvt',
      () => '2026-02-22T00:00:00.000Z',
      unusedWithClient
    );
    const executor = new InMemorySqlExecutor();

    await store.append(executor, 'tenant-a', 'run-a', [
      makeEvent({ runId: 'run-a', idempotencyKey: 'run-a:queued', eventType: 'RunQueued' }),
    ]);

    const result = await store.append(executor, 'tenant-a', 'run-a', [
      makeEvent({ runId: 'run-a', idempotencyKey: 'run-a:started', eventType: 'RunStarted' }),
      makeEvent({ runId: 'run-a', idempotencyKey: 'run-a:started', eventType: 'RunStarted' }),
      makeEvent({ runId: 'run-a', idempotencyKey: 'run-a:completed', eventType: 'RunCompleted' }),
    ]);

    expect(result.appended).toHaveLength(2);
    expect(result.deduped).toHaveLength(1);
    expect(result.appended[0]?.runSeq).toBe(2);
    expect(result.appended[1]?.runSeq).toBe(3);
    expect(result.lastAppendedRunSeq).toBe(3);
  });
});
