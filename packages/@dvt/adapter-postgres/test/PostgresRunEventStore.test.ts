import { describe, expect, it } from 'vitest';

import { PostgresRunEventStore } from '../src/PostgresRunEventStore.js';
import {
  RUN_EVENT_STORE_ERROR_CODE,
  RUN_EVENT_STORE_MESSAGE_KEY,
} from '../src/runEventStoreErrors.js';
import type { EventEnvelope, EventInput } from '../src/types.js';

const TEST_SCHEMA = 'dvt';
const TEST_NOW_ISO = '2026-02-22T00:00:00.000Z';
const TEST_TENANT_ID = 'tenant-a';
const TEST_OTHER_TENANT_ID = 'tenant-b';
const TEST_RUN_ID = 'run-a';
const TEST_OTHER_RUN_ID = 'run-b';
const TEST_PROJECT_ID = 'project-a';
const TEST_ENVIRONMENT_ID = 'env-a';
const TEST_PLAN_ID = 'plan-a';
const TEST_PLAN_VERSION = '1.0.0';

const SQL_MARKER = {
  advisoryLock: 'pg_advisory_xact_lock',
  maxRunSeq: 'COALESCE(MAX(run_seq), 0) AS max_seq',
  insertIntoRunEvents: 'INSERT INTO',
  runEventsTable: 'run_events',
  selectByIdempotency: 'WHERE run_id = $1 AND idempotency_key = $2',
} as const;

class InMemorySqlExecutor {
  private readonly byIdempotency = new Map<string, EventEnvelope>();
  private readonly ordered: EventEnvelope[] = [];
  private maxRunSeq = 0;

  async query<T = unknown>(
    text: string,
    params?: readonly unknown[]
  ): Promise<{ rows: T[]; rowCount?: number | null }> {
    if (text.includes(SQL_MARKER.advisoryLock)) {
      return { rows: [] };
    }

    if (text.includes(SQL_MARKER.maxRunSeq)) {
      return { rows: [{ max_seq: this.maxRunSeq } as T] };
    }

    if (text.includes(SQL_MARKER.insertIntoRunEvents) && text.includes(SQL_MARKER.runEventsTable)) {
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

    if (text.includes(SQL_MARKER.selectByIdempotency)) {
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
    emittedAt: overrides.emittedAt ?? TEST_NOW_ISO,
    tenantId: overrides.tenantId ?? TEST_TENANT_ID,
    projectId: overrides.projectId ?? TEST_PROJECT_ID,
    environmentId: overrides.environmentId ?? TEST_ENVIRONMENT_ID,
    planId: overrides.planId ?? TEST_PLAN_ID,
    planVersion: overrides.planVersion ?? TEST_PLAN_VERSION,
    engineAttemptId: overrides.engineAttemptId ?? 1,
    logicalAttemptId: overrides.logicalAttemptId ?? 1,
    idempotencyKey: overrides.idempotencyKey,
    payloadVersion: 1,
  };
}

async function unusedWithClient<T>(_fn: (client: never) => Promise<T>): Promise<T> {
  throw new Error('unused_with_client');
}

function makeListStoreHarness(rows: EventEnvelope[] = []): {
  store: PostgresRunEventStore;
  calls: Array<{ text: string; params?: readonly unknown[] }>;
} {
  const calls: Array<{ text: string; params?: readonly unknown[] }> = [];
  const store = new PostgresRunEventStore(
    TEST_SCHEMA,
    () => TEST_NOW_ISO,
    async (fn) => {
      const client = {
        async query<T = unknown>(
          text: string,
          params?: readonly unknown[]
        ): Promise<{ rows: T[]; rowCount?: number | null }> {
          calls.push({ text, params });
          return { rows: rows.map((payload) => ({ payload })) as T[] };
        },
      };
      return fn(client as never);
    }
  );

  return { store, calls };
}

describe('PostgresRunEventStore append invariants', () => {
  it('throws typed stable error when event schema is invalid', async () => {
    const store = new PostgresRunEventStore(TEST_SCHEMA, () => TEST_NOW_ISO, unusedWithClient);
    const executor = new InMemorySqlExecutor();
    const invalidSchemaEnvelope = {
      ...makeEvent({ runId: TEST_RUN_ID, idempotencyKey: `${TEST_RUN_ID}:invalid-schema` }),
      payloadVersion: 2,
    } as unknown as EventInput;

    await expect(
      store.append(executor, TEST_TENANT_ID, TEST_RUN_ID, [invalidSchemaEnvelope])
    ).rejects.toMatchObject({
      name: 'InvalidRunEventSchemaError',
      code: RUN_EVENT_STORE_ERROR_CODE.INVALID_EVENT_SCHEMA,
      messageKey: RUN_EVENT_STORE_MESSAGE_KEY.INVALID_EVENT_SCHEMA,
    });
  });

  it('throws typed stable error when event runId mismatches target runId', async () => {
    const store = new PostgresRunEventStore(TEST_SCHEMA, () => TEST_NOW_ISO, unusedWithClient);
    const executor = new InMemorySqlExecutor();

    await expect(
      store.append(executor, TEST_TENANT_ID, TEST_RUN_ID, [
        makeEvent({ runId: TEST_OTHER_RUN_ID, idempotencyKey: `${TEST_OTHER_RUN_ID}:started` }),
      ])
    ).rejects.toMatchObject({
      name: 'InvalidRunEventEnvelopeError',
      code: RUN_EVENT_STORE_ERROR_CODE.INVALID_EVENT_ENVELOPE,
    });
  });

  it('throws typed stable error when event tenantId mismatches target tenantId', async () => {
    const store = new PostgresRunEventStore(TEST_SCHEMA, () => TEST_NOW_ISO, unusedWithClient);
    const executor = new InMemorySqlExecutor();

    await expect(
      store.append(executor, TEST_TENANT_ID, TEST_RUN_ID, [
        makeEvent({
          runId: TEST_RUN_ID,
          tenantId: TEST_OTHER_TENANT_ID,
          idempotencyKey: `${TEST_RUN_ID}:started`,
        }),
      ])
    ).rejects.toMatchObject({
      name: 'InvalidRunEventTenantError',
      code: RUN_EVENT_STORE_ERROR_CODE.INVALID_EVENT_TENANT,
    });
  });

  it('does not consume runSeq slots for deduped entries in the same append flow', async () => {
    const store = new PostgresRunEventStore(TEST_SCHEMA, () => TEST_NOW_ISO, unusedWithClient);
    const executor = new InMemorySqlExecutor();

    await store.append(executor, TEST_TENANT_ID, TEST_RUN_ID, [
      makeEvent({
        runId: TEST_RUN_ID,
        idempotencyKey: `${TEST_RUN_ID}:queued`,
        eventType: 'RunQueued',
      }),
    ]);

    const result = await store.append(executor, TEST_TENANT_ID, TEST_RUN_ID, [
      makeEvent({
        runId: TEST_RUN_ID,
        idempotencyKey: `${TEST_RUN_ID}:started`,
        eventType: 'RunStarted',
      }),
      makeEvent({
        runId: TEST_RUN_ID,
        idempotencyKey: `${TEST_RUN_ID}:started`,
        eventType: 'RunStarted',
      }),
      makeEvent({
        runId: TEST_RUN_ID,
        idempotencyKey: `${TEST_RUN_ID}:completed`,
        eventType: 'RunCompleted',
      }),
    ]);

    expect(result.appended).toHaveLength(2);
    expect(result.deduped).toHaveLength(1);
    expect(result.appended[0]?.runSeq).toBe(2);
    expect(result.appended[1]?.runSeq).toBe(3);
    expect(result.lastAppendedRunSeq).toBe(3);
  });

  it('throws typed stable error when persisted max run sequence is unsafe', async () => {
    const store = new PostgresRunEventStore(TEST_SCHEMA, () => TEST_NOW_ISO, unusedWithClient);
    const executor = {
      async query<T = unknown>(
        text: string,
        _params?: readonly unknown[]
      ): Promise<{ rows: T[]; rowCount?: number | null }> {
        if (text.includes(SQL_MARKER.advisoryLock)) {
          return { rows: [] };
        }
        if (text.includes(SQL_MARKER.maxRunSeq)) {
          return { rows: [{ max_seq: '9007199254740992' }] as T[] };
        }
        return { rows: [] };
      },
    };

    await expect(
      store.append(executor, TEST_TENANT_ID, TEST_RUN_ID, [
        makeEvent({
          runId: TEST_RUN_ID,
          idempotencyKey: `${TEST_RUN_ID}:started`,
          eventType: 'RunStarted',
        }),
      ])
    ).rejects.toMatchObject({
      name: 'InvalidRunSequenceValueError',
      code: RUN_EVENT_STORE_ERROR_CODE.INVALID_RUN_SEQUENCE_VALUE,
      messageKey: RUN_EVENT_STORE_MESSAGE_KEY.INVALID_RUN_SEQUENCE_VALUE,
    });
  });
});

describe('PostgresRunEventStore listEvents policy', () => {
  it('preserves explicit limit=0 without coercing to 1', async () => {
    const { store, calls } = makeListStoreHarness([]);

    const result = await store.listEvents(TEST_TENANT_ID, TEST_RUN_ID, { limit: 0 });

    expect(result).toEqual([]);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.params).toEqual([TEST_TENANT_ID, TEST_RUN_ID, 0]);
  });

  it('rejects negative limit with a typed stable error', async () => {
    const { store, calls } = makeListStoreHarness([]);

    await expect(
      store.listEvents(TEST_TENANT_ID, TEST_RUN_ID, { limit: -1 })
    ).rejects.toMatchObject({
      name: 'InvalidListEventsLimitError',
      code: RUN_EVENT_STORE_ERROR_CODE.INVALID_LIST_EVENTS_LIMIT,
    });
    expect(calls).toHaveLength(0);
  });
});
