import { describe, expect, it } from 'vitest';

import { ENGINE_ERROR_CODE, InvalidRunEventInputError } from '../../src/contracts/errors.js';
import type { RunBootstrapInput } from '../../src/ports/IRunStateStore.js';
import { InMemoryRunStateStore } from '../../src/state/InMemoryRunStateStore.js';
import { InMemoryTxStore } from '../../src/state/InMemoryTxStore.js';

function makeInvalidBootstrap(runId: string): RunBootstrapInput {
  return {
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
        payloadVersion: 2,
      },
    ],
  };
}

describe('bootstrapRunTx atomicity', () => {
  it('InMemoryTxStore does not persist metadata/events/snapshot when first event validation fails', async () => {
    const store = new InMemoryTxStore();
    const runId = 'run-invalid-bootstrap-tx';

    await expect(store.bootstrapRunTx(makeInvalidBootstrap(runId))).rejects.toMatchObject({
      name: 'InvalidRunEventInputError',
      code: ENGINE_ERROR_CODE.INVALID_RUN_EVENT_INPUT,
    });
    await expect(store.bootstrapRunTx(makeInvalidBootstrap(runId))).rejects.toBeInstanceOf(
      InvalidRunEventInputError
    );

    await expect(store.getRunMetadataByRunId('t1', runId)).resolves.toBeNull();
    await expect(store.listEvents('t1', runId)).resolves.toEqual([]);
    await expect(store.getSnapshot('t1', runId)).resolves.toBeNull();
    await expect(store.listPending(10)).resolves.toEqual([]);
  });

  it('InMemoryRunStateStore does not persist metadata/events/snapshot when first event validation fails', async () => {
    const store = new InMemoryRunStateStore();
    const runId = 'run-invalid-bootstrap-rs';

    await expect(store.bootstrapRunTx(makeInvalidBootstrap(runId))).rejects.toMatchObject({
      name: 'InvalidRunEventInputError',
      code: ENGINE_ERROR_CODE.INVALID_RUN_EVENT_INPUT,
    });
    await expect(store.bootstrapRunTx(makeInvalidBootstrap(runId))).rejects.toBeInstanceOf(
      InvalidRunEventInputError
    );

    await expect(store.getRunMetadataByRunId('t1', runId)).resolves.toBeNull();
    await expect(store.listEvents('t1', runId)).resolves.toEqual([]);
    await expect(store.getSnapshot('t1', runId)).resolves.toBeNull();
  });
});
