import { InvalidStateTransitionError } from '@dvt/run-domain';
import { describe, expect, it } from 'vitest';

import { ENGINE_ERROR_CODE, RunNotFoundError } from '../../src/contracts/errors.js';
import { InMemoryRunStateStore } from '../../src/state/InMemoryRunStateStore.js';

describe('InMemoryRunStateStore append invariants', () => {
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
        provider: 'mock',
        providerWorkflowId: `wf-${runId}`,
        providerRunId: `pr-${runId}`,
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
        provider: 'mock',
        providerWorkflowId: `wf-${runId}`,
        providerRunId: `pr-${runId}`,
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
});
