import { describe, expect, it, vi } from 'vitest';

import { PostgresRunStateCoordinator } from '../src/PostgresRunStateCoordinator.js';
import type { AppendResult, EventInput, RunBootstrapInput } from '../src/types.js';

const TEST_TENANT_ID = 'tenant-a';
const TEST_RUN_ID = 'run-1';
const TEST_PROJECT_ID = 'project-a';
const TEST_ENVIRONMENT_ID = 'dev';
const TEST_PROVIDER = 'temporal';
const TEST_WORKFLOW_ID = 'wf-1';
const TEST_PROVIDER_RUN_ID = 'pr-1';
const TEST_CREATED_AT = '2026-03-28T00:00:00.000Z';
const PG_UNIQUE_VIOLATION_CODE = '23505';
const RUN_METADATA_TABLE = 'run_metadata';
const RUN_METADATA_PKEY_CONSTRAINT = 'run_metadata_pkey';
const RUN_EVENTS_TABLE = 'run_events';
const RUN_EVENTS_IDEMPOTENCY_CONSTRAINT = 'run_events_run_id_idempotency_key_key';
const RUN_ALREADY_EXISTS_MESSAGE = 'RUN_ALREADY_EXISTS';
const RUN_ALREADY_EXISTS_NAME = 'RunAlreadyExistsError';
const TENANT_SCOPE_REQUIRED_MESSAGE = 'TENANT_SCOPE_REQUIRED';
const EMPTY_TENANT = '   ';
const ZERO_SEQ = 0;
const EMPTY_EVENTS: EventInput[] = [];

function makeAppendResult(): {
  appended: AppendResult['appended'];
  deduped: AppendResult['deduped'];
  lastAppendedRunSeq: number;
  baseRunSeq: number;
} {
  return {
    appended: [],
    deduped: [],
    lastAppendedRunSeq: ZERO_SEQ,
    baseRunSeq: ZERO_SEQ,
  };
}

function makeBootstrapInput(tenantId = TEST_TENANT_ID): RunBootstrapInput {
  return {
    metadata: {
      runId: TEST_RUN_ID,
      tenantId,
      projectId: TEST_PROJECT_ID,
      environmentId: TEST_ENVIRONMENT_ID,
      provider: TEST_PROVIDER,
      providerWorkflowId: TEST_WORKFLOW_ID,
      providerRunId: TEST_PROVIDER_RUN_ID,
      createdAt: TEST_CREATED_AT,
    },
    firstEvents: [] as EventInput[],
  };
}

describe('PostgresRunStateCoordinator', () => {
  it('maps unique violations from run_metadata to RUN_ALREADY_EXISTS', async () => {
    const pgUniqueError = {
      code: PG_UNIQUE_VIOLATION_CODE,
      table: RUN_METADATA_TABLE,
      constraint: RUN_METADATA_PKEY_CONSTRAINT,
    };
    const coordinator = new PostgresRunStateCoordinator({
      metadataRepo: {
        resolveTenantWithClient: async () => TEST_TENANT_ID,
        insertWithClient: async () => {
          throw pgUniqueError;
        },
      },
      runEventRepository: {
        append: async () => makeAppendResult(),
      },
      snapshotStore: {
        updateWithClient: async () => undefined,
      },
      outboxStore: {
        enqueueWithClient: async () => undefined,
      },
      setTenantContext: async () => undefined,
      withTransaction: async (fn) => fn({} as never),
    });

    await expect(coordinator.bootstrapRunTx(makeBootstrapInput())).rejects.toMatchObject({
      message: RUN_ALREADY_EXISTS_MESSAGE,
      name: RUN_ALREADY_EXISTS_NAME,
    });
  });

  it('does not mask unique violations unrelated to run_metadata', async () => {
    const error = {
      code: PG_UNIQUE_VIOLATION_CODE,
      table: RUN_EVENTS_TABLE,
      constraint: RUN_EVENTS_IDEMPOTENCY_CONSTRAINT,
    };
    const coordinator = new PostgresRunStateCoordinator({
      metadataRepo: {
        resolveTenantWithClient: async () => TEST_TENANT_ID,
        insertWithClient: async () => undefined,
      },
      runEventRepository: {
        append: async () => {
          throw error;
        },
      },
      snapshotStore: {
        updateWithClient: async () => undefined,
      },
      outboxStore: {
        enqueueWithClient: async () => undefined,
      },
      setTenantContext: async () => undefined,
      withTransaction: async (fn) => fn({} as never),
    });

    await expect(coordinator.bootstrapRunTx(makeBootstrapInput())).rejects.toMatchObject(error);
  });

  it('rejects empty tenant in appendAndEnqueueTx before setting tenant context', async () => {
    const coordinator = new PostgresRunStateCoordinator({
      metadataRepo: {
        resolveTenantWithClient: async () => EMPTY_TENANT,
        insertWithClient: async () => undefined,
      },
      runEventRepository: {
        append: async () => makeAppendResult(),
      },
      snapshotStore: {
        updateWithClient: async () => undefined,
      },
      outboxStore: {
        enqueueWithClient: async () => undefined,
      },
      setTenantContext: async () => undefined,
      withTransaction: async (fn) => fn({} as never),
    });

    await expect(coordinator.appendAndEnqueueTx(TEST_RUN_ID, EMPTY_EVENTS)).rejects.toThrow(
      TENANT_SCOPE_REQUIRED_MESSAGE
    );
  });

  it('rejects empty tenant in bootstrapRunTx before setting tenant context', async () => {
    const setTenantContext = vi.fn(async () => undefined);
    const coordinator = new PostgresRunStateCoordinator({
      metadataRepo: {
        resolveTenantWithClient: async () => TEST_TENANT_ID,
        insertWithClient: async () => undefined,
      },
      runEventRepository: {
        append: async () => makeAppendResult(),
      },
      snapshotStore: {
        updateWithClient: async () => undefined,
      },
      outboxStore: {
        enqueueWithClient: async () => undefined,
      },
      setTenantContext,
      withTransaction: async (fn) => fn({} as never),
    });

    await expect(coordinator.bootstrapRunTx(makeBootstrapInput(EMPTY_TENANT))).rejects.toThrow(
      TENANT_SCOPE_REQUIRED_MESSAGE
    );
    expect(setTenantContext).not.toHaveBeenCalled();
  });

  it('bootstrapRunTx happy path executes operations in contract order', async () => {
    const calls: string[] = [];
    const coordinator = new PostgresRunStateCoordinator({
      metadataRepo: {
        resolveTenantWithClient: async () => TEST_TENANT_ID,
        insertWithClient: async () => {
          calls.push('insertWithClient');
        },
      },
      runEventRepository: {
        append: async () => {
          calls.push('append');
          return makeAppendResult();
        },
      },
      snapshotStore: {
        updateWithClient: async () => {
          calls.push('updateWithClient');
        },
      },
      outboxStore: {
        enqueueWithClient: async () => {
          calls.push('enqueueWithClient');
        },
      },
      setTenantContext: async () => {
        calls.push('setTenantContext');
      },
      withTransaction: async (fn) => fn({} as never),
    });

    await coordinator.bootstrapRunTx(makeBootstrapInput());

    expect(calls).toEqual([
      'setTenantContext',
      'insertWithClient',
      'append',
      'updateWithClient',
      'enqueueWithClient',
    ]);
  });

  it('enqueueTx happy path resolves tenant, sets context, and enqueues', async () => {
    const resolveTenantWithClient = vi.fn(async () => TEST_TENANT_ID);
    const setTenantContext = vi.fn(async () => undefined);
    const enqueueWithClient = vi.fn(async () => undefined);

    const coordinator = new PostgresRunStateCoordinator({
      metadataRepo: {
        resolveTenantWithClient,
        insertWithClient: async () => undefined,
      },
      runEventRepository: {
        append: async () => makeAppendResult(),
      },
      snapshotStore: {
        updateWithClient: async () => undefined,
      },
      outboxStore: {
        enqueueWithClient,
      },
      setTenantContext,
      withTransaction: async (fn) => fn({} as never),
    });

    await coordinator.enqueueTx(TEST_RUN_ID, EMPTY_EVENTS);

    expect(resolveTenantWithClient).toHaveBeenCalledTimes(1);
    expect(setTenantContext).toHaveBeenCalledTimes(1);
    expect(enqueueWithClient).toHaveBeenCalledTimes(1);
    expect(enqueueWithClient).toHaveBeenCalledWith(expect.anything(), TEST_RUN_ID, EMPTY_EVENTS);
  });

  it('enqueueTx rejects empty tenant and does not enqueue', async () => {
    const enqueueWithClient = vi.fn(async () => undefined);
    const coordinator = new PostgresRunStateCoordinator({
      metadataRepo: {
        resolveTenantWithClient: async () => EMPTY_TENANT,
        insertWithClient: async () => undefined,
      },
      runEventRepository: {
        append: async () => makeAppendResult(),
      },
      snapshotStore: {
        updateWithClient: async () => undefined,
      },
      outboxStore: {
        enqueueWithClient,
      },
      setTenantContext: async () => undefined,
      withTransaction: async (fn) => fn({} as never),
    });

    await expect(coordinator.enqueueTx(TEST_RUN_ID, EMPTY_EVENTS)).rejects.toThrow(
      TENANT_SCOPE_REQUIRED_MESSAGE
    );
    expect(enqueueWithClient).not.toHaveBeenCalled();
  });

  it('appendAndEnqueueTx does not enqueue when snapshot update fails', async () => {
    const enqueueWithClient = vi.fn(async () => undefined);
    const coordinator = new PostgresRunStateCoordinator({
      metadataRepo: {
        resolveTenantWithClient: async () => TEST_TENANT_ID,
        insertWithClient: async () => undefined,
      },
      runEventRepository: {
        append: async () => makeAppendResult(),
      },
      snapshotStore: {
        updateWithClient: async () => {
          throw new Error('snapshot update failed');
        },
      },
      outboxStore: {
        enqueueWithClient,
      },
      setTenantContext: async () => undefined,
      withTransaction: async (fn) => fn({} as never),
    });

    await expect(coordinator.appendAndEnqueueTx(TEST_RUN_ID, EMPTY_EVENTS)).rejects.toThrow(
      /snapshot update failed/
    );
    expect(enqueueWithClient).not.toHaveBeenCalled();
  });

  it('appendAndEnqueueTx does not update snapshot or enqueue when append fails', async () => {
    const updateWithClient = vi.fn(async () => undefined);
    const enqueueWithClient = vi.fn(async () => undefined);
    const coordinator = new PostgresRunStateCoordinator({
      metadataRepo: {
        resolveTenantWithClient: async () => TEST_TENANT_ID,
        insertWithClient: async () => undefined,
      },
      runEventRepository: {
        append: async () => {
          throw new Error('append failed');
        },
      },
      snapshotStore: {
        updateWithClient,
      },
      outboxStore: {
        enqueueWithClient,
      },
      setTenantContext: async () => undefined,
      withTransaction: async (fn) => fn({} as never),
    });

    await expect(coordinator.appendAndEnqueueTx(TEST_RUN_ID, EMPTY_EVENTS)).rejects.toThrow(
      /append failed/
    );
    expect(updateWithClient).not.toHaveBeenCalled();
    expect(enqueueWithClient).not.toHaveBeenCalled();
  });
});
