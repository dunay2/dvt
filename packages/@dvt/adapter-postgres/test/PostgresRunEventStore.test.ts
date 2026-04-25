import { describe, expect, it } from 'vitest';

import type { RunEventStoragePort } from '../src/PostgresRunEventStorage.js';
import { PostgresRunEventStore } from '../src/PostgresRunEventStore.js';
import {
  InvalidRunSequenceValueError,
  RUN_EVENT_STORE_ERROR_CODE,
  RUN_EVENT_STORE_MESSAGE_KEY,
} from '../src/runEventStoreErrors.js';
import type { SqlCommandExecutor } from '../src/RunEventWriteRepository.js';
import type { EventEnvelope, EventInput, RunId } from '../src/types.js';

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
const TEST_UNSAFE_MAX_RUN_SEQ = '9007199254740992';

const NOOP_SQL_EXECUTOR: SqlCommandExecutor = {
  async query<T = unknown>(): Promise<{ rows: T[]; rowCount?: number | null }> {
    return { rows: [] };
  },
};

class InMemoryRunEventStorage implements RunEventStoragePort {
  private readonly byRunAndIdempotency = new Map<string, EventEnvelope>();
  private maxRunSeq = 0;
  public readonly upsertedHeads: Array<{
    runId: RunId;
    tenantId: string;
    runSeq: number;
    updatedAt: string;
  }> = [];
  public readonly queuedSnapshotWork: Array<{
    runId: RunId;
    tenantId: string;
    runSeq: number;
    enqueuedAt: string;
  }> = [];

  async acquireRunLock(_executor: SqlCommandExecutor, _runId: RunId): Promise<void> {
    // no-op for append policy tests
  }

  async readMaxRunSeq(_executor: SqlCommandExecutor, _runId: RunId): Promise<number> {
    return this.maxRunSeq;
  }

  async insertEvent(
    _executor: SqlCommandExecutor,
    runId: RunId,
    envelope: EventEnvelope
  ): Promise<boolean> {
    const key = this.key(runId, envelope.idempotencyKey);
    if (this.byRunAndIdempotency.has(key)) {
      return false;
    }
    this.byRunAndIdempotency.set(key, envelope);
    this.maxRunSeq = Math.max(this.maxRunSeq, envelope.runSeq);
    return true;
  }

  async upsertRunEventHead(
    _executor: SqlCommandExecutor,
    runId: RunId,
    tenantId: string,
    runSeq: number,
    updatedAt: string
  ): Promise<void> {
    this.upsertedHeads.push({ runId, tenantId, runSeq, updatedAt });
  }

  async upsertSnapshotWorkItem(
    _executor: SqlCommandExecutor,
    runId: RunId,
    tenantId: string,
    runSeq: number,
    enqueuedAt: string
  ): Promise<void> {
    this.queuedSnapshotWork.push({ runId, tenantId, runSeq, enqueuedAt });
  }

  async selectExistingEvent(
    _executor: SqlCommandExecutor,
    runId: RunId,
    idempotencyKey: string
  ): Promise<EventEnvelope | null> {
    return this.byRunAndIdempotency.get(this.key(runId, idempotencyKey)) ?? null;
  }

  async listEvents(): Promise<EventEnvelope[]> {
    return [];
  }

  private key(runId: RunId, idempotencyKey: string): string {
    return `${runId}::${idempotencyKey}`;
  }
}

class UnsafeMaxRunSequenceStorage extends InMemoryRunEventStorage {
  override async readMaxRunSeq(_executor: SqlCommandExecutor, runId: RunId): Promise<number> {
    throw new InvalidRunSequenceValueError(runId, TEST_UNSAFE_MAX_RUN_SEQ);
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

function makeAppendStoreHarness(
  storage: RunEventStoragePort = new InMemoryRunEventStorage(),
  now: () => string = () => TEST_NOW_ISO
): {
  store: PostgresRunEventStore;
  executor: SqlCommandExecutor;
} {
  const store = new PostgresRunEventStore(TEST_SCHEMA, now, unusedWithClient, storage);
  return { store, executor: NOOP_SQL_EXECUTOR };
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
          if (text.includes("set_config('dvt.")) {
            return { rows: [] };
          }
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
    const { store, executor } = makeAppendStoreHarness();
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

  it('throws typed stable error when payloadVersion is missing from the write envelope', async () => {
    const { store, executor } = makeAppendStoreHarness();
    const invalidSchemaEnvelope = {
      ...makeEvent({ runId: TEST_RUN_ID, idempotencyKey: `${TEST_RUN_ID}:missing-version` }),
    } as Record<string, unknown>;
    delete invalidSchemaEnvelope['payloadVersion'];

    await expect(
      store.append(executor, TEST_TENANT_ID, TEST_RUN_ID, [
        invalidSchemaEnvelope as unknown as EventInput,
      ])
    ).rejects.toMatchObject({
      name: 'InvalidRunEventSchemaError',
      code: RUN_EVENT_STORE_ERROR_CODE.INVALID_EVENT_SCHEMA,
      messageKey: RUN_EVENT_STORE_MESSAGE_KEY.INVALID_EVENT_SCHEMA,
    });
  });

  it('throws typed stable error when runId is only whitespace', async () => {
    const { store, executor } = makeAppendStoreHarness();
    const invalidSchemaEnvelope = {
      ...makeEvent({ runId: '   ', idempotencyKey: `${TEST_RUN_ID}:blank-run-id` }),
    } as unknown as EventInput;

    await expect(
      store.append(executor, TEST_TENANT_ID, TEST_RUN_ID, [invalidSchemaEnvelope])
    ).rejects.toMatchObject({
      name: 'InvalidRunEventSchemaError',
      code: RUN_EVENT_STORE_ERROR_CODE.INVALID_EVENT_SCHEMA,
      messageKey: RUN_EVENT_STORE_MESSAGE_KEY.INVALID_EVENT_SCHEMA,
    });
  });

  it('throws typed stable error when stepId is only whitespace', async () => {
    const { store, executor } = makeAppendStoreHarness();
    const invalidSchemaEnvelope = {
      ...makeEvent({
        runId: TEST_RUN_ID,
        idempotencyKey: `${TEST_RUN_ID}:blank-step-id`,
        eventType: 'StepFailed',
      }),
      stepId: '   ',
      payload: {
        reason: 'SINK_WRITE_FAILED',
      },
    } as unknown as EventInput;

    await expect(
      store.append(executor, TEST_TENANT_ID, TEST_RUN_ID, [invalidSchemaEnvelope])
    ).rejects.toMatchObject({
      name: 'InvalidRunEventSchemaError',
      code: RUN_EVENT_STORE_ERROR_CODE.INVALID_EVENT_SCHEMA,
      messageKey: RUN_EVENT_STORE_MESSAGE_KEY.INVALID_EVENT_SCHEMA,
    });
  });

  it('throws typed stable error when emittedAt is only whitespace', async () => {
    const { store, executor } = makeAppendStoreHarness();
    const invalidSchemaEnvelope = {
      ...makeEvent({
        runId: TEST_RUN_ID,
        idempotencyKey: `${TEST_RUN_ID}:blank-emitted-at`,
      }),
      emittedAt: '   ',
    } as unknown as EventInput;

    await expect(
      store.append(executor, TEST_TENANT_ID, TEST_RUN_ID, [invalidSchemaEnvelope])
    ).rejects.toMatchObject({
      name: 'InvalidRunEventSchemaError',
      code: RUN_EVENT_STORE_ERROR_CODE.INVALID_EVENT_SCHEMA,
      messageKey: RUN_EVENT_STORE_MESSAGE_KEY.INVALID_EVENT_SCHEMA,
    });
  });

  it('throws typed stable error when generated persistedAt is only whitespace', async () => {
    const { store, executor } = makeAppendStoreHarness(new InMemoryRunEventStorage(), () => '   ');

    await expect(
      store.append(executor, TEST_TENANT_ID, TEST_RUN_ID, [
        makeEvent({
          runId: TEST_RUN_ID,
          idempotencyKey: `${TEST_RUN_ID}:invalid-generated-persisted-at`,
          eventType: 'RunStarted',
        }),
      ])
    ).rejects.toMatchObject({
      name: 'InvalidRunEventSchemaError',
      code: RUN_EVENT_STORE_ERROR_CODE.INVALID_EVENT_SCHEMA,
      messageKey: RUN_EVENT_STORE_MESSAGE_KEY.INVALID_EVENT_SCHEMA,
    });
  });

  it('throws typed stable error when event runId mismatches target runId', async () => {
    const { store, executor } = makeAppendStoreHarness();

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
    const { store, executor } = makeAppendStoreHarness();

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
    const { store, executor } = makeAppendStoreHarness();

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
    const { store, executor } = makeAppendStoreHarness(new UnsafeMaxRunSequenceStorage());

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

  it('upserts run_event_heads only for newly appended events', async () => {
    const storage = new InMemoryRunEventStorage();
    const { store, executor } = makeAppendStoreHarness(storage);

    await store.append(executor, TEST_TENANT_ID, TEST_RUN_ID, [
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

    expect(storage.upsertedHeads).toEqual([
      {
        runId: TEST_RUN_ID,
        tenantId: TEST_TENANT_ID,
        runSeq: 1,
        updatedAt: TEST_NOW_ISO,
      },
      {
        runId: TEST_RUN_ID,
        tenantId: TEST_TENANT_ID,
        runSeq: 2,
        updatedAt: TEST_NOW_ISO,
      },
    ]);
    expect(storage.queuedSnapshotWork).toEqual([
      {
        runId: TEST_RUN_ID,
        tenantId: TEST_TENANT_ID,
        runSeq: 1,
        enqueuedAt: TEST_NOW_ISO,
      },
      {
        runId: TEST_RUN_ID,
        tenantId: TEST_TENANT_ID,
        runSeq: 2,
        enqueuedAt: TEST_NOW_ISO,
      },
    ]);
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
