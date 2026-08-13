import { InvalidStateTransitionError } from '@dvt/run-domain';
import { describe, expect, it } from 'vitest';

import { ENGINE_ERROR_CODE, RunNotFoundError } from '../../src/contracts/errors.js';
import { InMemoryRunStateStore } from '../../src/state/InMemoryRunStateStore.js';

describe('InMemoryRunStateStore append invariants', () => {
  it('queries event idempotency keys within the tenant and run boundary', async () => {
    const store = new InMemoryRunStateStore();
    const runId = 'run-idempotency-query';
    const idempotencyKey = `${runId}:queued`;

    await store.bootstrapRunTx({
      metadata: {
        tenantId: 't1',
        projectId: 'p1',
        environmentId: 'dev',
        runId,
        planId: 'plan-minimal',
        planVersion: '1.0',
        logicalAttemptId: 1,
        providerRef: {
          provider: 'temporal',
          tenantId: 't1',
          namespace: 'default',
          workflowId: `wf-${runId}`,
          runId: `pr-${runId}`,
        },
      },
      firstEvents: [
        {
          eventId: `${runId}:queued`,
          eventType: 'RunQueued',
          runId,
          tenantId: 't1',
          projectId: 'p1',
          environmentId: 'dev',
          planId: 'plan-minimal',
          planVersion: '1.0',
          logicalAttemptId: 1,
          engineAttemptId: 1,
          emittedAt: '2026-03-26T00:00:00.000Z',
          idempotencyKey,
          payloadVersion: 1,
        },
      ],
    });

    await expect(store.hasEventByIdempotencyKey('t1', runId, idempotencyKey)).resolves.toBe(true);
    await expect(store.hasEventByIdempotencyKey('t1', runId, 'missing-key')).resolves.toBe(false);
    await expect(store.hasEventByIdempotencyKey('t2', runId, idempotencyKey)).resolves.toBe(false);
  });

  it('rejects append when run metadata does not exist', async () => {
    const store = new InMemoryRunStateStore();
    const runId = 'missing-run';

    await expect(
      store.appendAndEnqueueTx(runId, [
        {
          eventId: `${runId}:queued`,
          eventType: 'RunQueued',
          runId,
          tenantId: 't1',
          projectId: 'p1',
          environmentId: 'dev',
          planId: 'plan-minimal',
          planVersion: '1.0',
          logicalAttemptId: 1,
          engineAttemptId: 1,
          emittedAt: '2026-03-26T00:00:00.000Z',
          idempotencyKey: `${runId}:queued`,
          payloadVersion: 1,
        },
      ])
    ).rejects.toBeInstanceOf(RunNotFoundError);

    await expect(store.listEvents('t1', runId)).resolves.toEqual([]);
  });

  it('rejects append when event tenantId does not match run tenant metadata', async () => {
    const store = new InMemoryRunStateStore();
    const runId = 'tenant-mismatch-run';

    await store.bootstrapRunTx({
      metadata: {
        tenantId: 't1',
        projectId: 'p1',
        environmentId: 'dev',
        runId,
        planId: 'plan-minimal',
        planVersion: '1.0',
        logicalAttemptId: 1,
        providerRef: {
          provider: 'temporal',
          tenantId: 't1',
          namespace: 'default',
          workflowId: `wf-${runId}`,
          runId: `pr-${runId}`,
        },
      },
      firstEvents: [
        {
          eventId: `${runId}:queued`,
          eventType: 'RunQueued',
          runId,
          tenantId: 't1',
          projectId: 'p1',
          environmentId: 'dev',
          planId: 'plan-minimal',
          planVersion: '1.0',
          logicalAttemptId: 1,
          engineAttemptId: 1,
          emittedAt: '2026-03-26T00:00:00.000Z',
          idempotencyKey: `${runId}:queued`,
          payloadVersion: 1,
        },
      ],
    });

    await expect(
      store.appendAndEnqueueTx(runId, [
        {
          eventId: `${runId}:started`,
          eventType: 'RunStarted',
          runId,
          tenantId: 't2',
          projectId: 'p1',
          environmentId: 'dev',
          planId: 'plan-minimal',
          planVersion: '1.0',
          logicalAttemptId: 1,
          engineAttemptId: 1,
          emittedAt: '2026-03-26T00:00:01.000Z',
          idempotencyKey: `${runId}:started`,
          payloadVersion: 1,
        },
      ])
    ).rejects.toMatchObject({
      name: 'InvalidRunEventInputError',
      code: ENGINE_ERROR_CODE.INVALID_RUN_EVENT_INPUT,
    });

    const events = await store.listEvents('t1', runId);
    expect(events).toHaveLength(1);
    expect(events[0]?.eventType).toBe('RunQueued');
  });

  it('rejects append when stepId is only whitespace', async () => {
    const store = new InMemoryRunStateStore();
    const runId = 'blank-step-id-run';

    await store.bootstrapRunTx({
      metadata: {
        tenantId: 't1',
        projectId: 'p1',
        environmentId: 'dev',
        runId,
        planId: 'plan-minimal',
        planVersion: '1.0',
        logicalAttemptId: 1,
        providerRef: {
          provider: 'temporal',
          tenantId: 't1',
          namespace: 'default',
          workflowId: `wf-${runId}`,
          runId: `pr-${runId}`,
        },
      },
      firstEvents: [
        {
          eventId: `${runId}:queued`,
          eventType: 'RunQueued',
          runId,
          tenantId: 't1',
          projectId: 'p1',
          environmentId: 'dev',
          planId: 'plan-minimal',
          planVersion: '1.0',
          logicalAttemptId: 1,
          engineAttemptId: 1,
          emittedAt: '2026-03-26T00:00:00.000Z',
          idempotencyKey: `${runId}:queued`,
          payloadVersion: 1,
        },
      ],
    });

    await expect(
      store.appendAndEnqueueTx(runId, [
        {
          eventId: `${runId}:step-failed`,
          eventType: 'StepFailed',
          stepId: '   ',
          runId,
          tenantId: 't1',
          projectId: 'p1',
          environmentId: 'dev',
          planId: 'plan-minimal',
          planVersion: '1.0',
          logicalAttemptId: 1,
          engineAttemptId: 1,
          emittedAt: '2026-03-26T00:00:01.000Z',
          idempotencyKey: `${runId}:step-failed`,
          payloadVersion: 1,
          payload: { reason: 'STEP_FAILURE' },
        },
      ])
    ).rejects.toMatchObject({
      name: 'InvalidRunEventInputError',
      code: ENGINE_ERROR_CODE.INVALID_RUN_EVENT_INPUT,
    });
  });

  it('rejects append when emittedAt is only whitespace', async () => {
    const store = new InMemoryRunStateStore();
    const runId = 'blank-emitted-at-run';

    await store.bootstrapRunTx({
      metadata: {
        tenantId: 't1',
        projectId: 'p1',
        environmentId: 'dev',
        runId,
        planId: 'plan-minimal',
        planVersion: '1.0',
        logicalAttemptId: 1,
        providerRef: {
          provider: 'temporal',
          tenantId: 't1',
          namespace: 'default',
          workflowId: `wf-${runId}`,
          runId: `pr-${runId}`,
        },
      },
      firstEvents: [
        {
          eventId: `${runId}:queued`,
          eventType: 'RunQueued',
          runId,
          tenantId: 't1',
          projectId: 'p1',
          environmentId: 'dev',
          planId: 'plan-minimal',
          planVersion: '1.0',
          logicalAttemptId: 1,
          engineAttemptId: 1,
          emittedAt: '2026-03-26T00:00:00.000Z',
          idempotencyKey: `${runId}:queued`,
          payloadVersion: 1,
        },
      ],
    });

    await expect(
      store.appendAndEnqueueTx(runId, [
        {
          eventId: `${runId}:started`,
          eventType: 'RunStarted',
          runId,
          tenantId: 't1',
          projectId: 'p1',
          environmentId: 'dev',
          planId: 'plan-minimal',
          planVersion: '1.0',
          logicalAttemptId: 1,
          engineAttemptId: 1,
          emittedAt: '   ',
          idempotencyKey: `${runId}:started`,
          payloadVersion: 1,
        },
      ])
    ).rejects.toMatchObject({
      name: 'InvalidRunEventInputError',
      code: ENGINE_ERROR_CODE.INVALID_RUN_EVENT_INPUT,
    });
  });

  it('rejects StepCompleted before StepStarted and keeps stream unchanged', async () => {
    const store = new InMemoryRunStateStore();
    const runId = 'run-invalid-step-order';

    await store.bootstrapRunTx({
      metadata: {
        tenantId: 't1',
        projectId: 'p1',
        environmentId: 'dev',
        runId,
        planId: 'plan-minimal',
        planVersion: '1.0',
        logicalAttemptId: 1,
        providerRef: {
          provider: 'temporal',
          tenantId: 't1',
          namespace: 'default',
          workflowId: `wf-${runId}`,
          runId: `pr-${runId}`,
        },
      },
      firstEvents: [
        {
          eventId: `${runId}:queued`,
          eventType: 'RunQueued',
          runId,
          tenantId: 't1',
          projectId: 'p1',
          environmentId: 'dev',
          planId: 'plan-minimal',
          planVersion: '1.0',
          logicalAttemptId: 1,
          engineAttemptId: 1,
          emittedAt: '2026-03-26T00:00:00.000Z',
          idempotencyKey: `${runId}:queued`,
          payloadVersion: 1,
        },
      ],
    });

    await expect(
      store.appendAndEnqueueTx(runId, [
        {
          eventId: `${runId}:step-completed`,
          eventType: 'StepCompleted',
          stepId: 's1',
          runId,
          tenantId: 't1',
          projectId: 'p1',
          environmentId: 'dev',
          planId: 'plan-minimal',
          planVersion: '1.0',
          logicalAttemptId: 1,
          engineAttemptId: 1,
          emittedAt: '2026-03-26T00:00:01.000Z',
          idempotencyKey: `${runId}:step-completed`,
          payloadVersion: 1,
          payload: { gatewayDecision: true },
        },
      ])
    ).rejects.toBeInstanceOf(InvalidStateTransitionError);

    const events = await store.listEvents('t1', runId);
    expect(events).toHaveLength(1);
    expect(events[0]?.eventType).toBe('RunQueued');
  });

  it('filters project and environment before applying the run limit', async () => {
    const store = new InMemoryRunStateStore();

    await bootstrapQueuedRun(store, {
      runId: 'run-in-scope',
      projectId: 'project-a',
      environmentId: 'env-a',
    });
    await bootstrapQueuedRun(store, {
      runId: 'run-newer-out-of-scope',
      projectId: 'project-b',
      environmentId: 'env-b',
    });

    await expect(
      store.listRuns({
        tenantId: 'tenant-a',
        projectId: 'project-a',
        environmentId: 'env-a',
        limit: 1,
      })
    ).resolves.toMatchObject([{ runId: 'run-in-scope' }]);
  });
});

async function bootstrapQueuedRun(
  store: InMemoryRunStateStore,
  input: { readonly runId: string; readonly projectId: string; readonly environmentId: string }
): Promise<void> {
  await store.bootstrapRunTx({
    metadata: {
      tenantId: 'tenant-a',
      projectId: input.projectId,
      environmentId: input.environmentId,
      runId: input.runId,
      planId: `plan-${input.runId}`,
      planVersion: '1.0.0',
      logicalAttemptId: 1,
      providerRef: {
        provider: 'temporal',
        tenantId: 'tenant-a',
        namespace: 'default',
        workflowId: `workflow-${input.runId}`,
        runId: input.runId,
      },
    },
    firstEvents: [
      {
        eventId: `event-${input.runId}`,
        eventType: 'RunQueued',
        runId: input.runId,
        tenantId: 'tenant-a',
        projectId: input.projectId,
        environmentId: input.environmentId,
        planId: `plan-${input.runId}`,
        planVersion: '1.0.0',
        logicalAttemptId: 1,
        engineAttemptId: 1,
        emittedAt: '2026-08-13T00:00:00.000Z',
        idempotencyKey: `queued-${input.runId}`,
        payloadVersion: 1,
      },
    ],
  });
}
