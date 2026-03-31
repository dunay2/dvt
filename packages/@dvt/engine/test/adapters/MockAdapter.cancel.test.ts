import { describe, expect, it } from 'vitest';

import { MockAdapter } from '../../src/adapters/mock/MockAdapter.js';
import { IdempotencyKeyBuilder } from '../../src/core/idempotency.js';
import { SnapshotProjector } from '../../src/core/SnapshotProjector.js';
import { InMemoryTxStore } from '../../src/state/InMemoryTxStore.js';
import { SequenceClock } from '../../src/utils/clock.js';

async function bootstrapRun(store: InMemoryTxStore, runId: string): Promise<void> {
  await store.bootstrapRunTx({
    metadata: {
      tenantId: 't',
      projectId: 'p',
      environmentId: 'dev',
      runId,
      planId: 'plan-1',
      planVersion: '1.0',
      logicalAttemptId: 1,
      provider: 'mock',
      providerWorkflowId: `mock_${runId}`,
      providerRunId: runId,
    },
    firstEvents: [
      {
        eventId: `${runId}:queued`,
        eventType: 'RunQueued',
        runId,
        tenantId: 't',
        projectId: 'p',
        environmentId: 'dev',
        planId: 'plan-1',
        planVersion: '1.0',
        logicalAttemptId: 1,
        engineAttemptId: 1,
        payloadVersion: 1,
        emittedAt: '2026-03-31T00:00:00.000Z',
        idempotencyKey: `${runId}:queued`,
      },
    ],
  });
}

describe('MockAdapter cancellation lifecycle', () => {
  it('cancelRun emits RunCancelRequested before RunCancelled and replays deterministically', async () => {
    const store = new InMemoryTxStore();
    const projector = new SnapshotProjector();
    const adapter = new MockAdapter({
      stateStore: store,
      stateStoreWrite: store,
      projector,
      clock: new SequenceClock('2026-03-31T00:00:00.000Z'),
      idempotency: new IdempotencyKeyBuilder(),
    });
    const runId = 'mock-cancel-1';
    await bootstrapRun(store, runId);
    const runRef = {
      provider: 'mock' as const,
      tenantId: 't',
      workflowId: `mock_${runId}`,
      runId,
    };

    await adapter.cancelRun(runRef);

    const events = await store.listEvents('t', runId);
    expect(events.map((event) => event.eventType)).toEqual([
      'RunQueued',
      'RunCancelRequested',
      'RunCancelled',
    ]);

    const firstStatus = await adapter.getRunStatus(runRef);
    const secondStatus = await adapter.getRunStatus(runRef);
    expect(firstStatus.status).toBe('CANCELLED');
    expect(secondStatus.hash).toBe(firstStatus.hash);
  });

  it('signal(CANCEL) follows the same lifecycle ordering as cancelRun', async () => {
    const store = new InMemoryTxStore();
    const projector = new SnapshotProjector();
    const adapter = new MockAdapter({
      stateStore: store,
      stateStoreWrite: store,
      projector,
      clock: new SequenceClock('2026-03-31T00:00:00.000Z'),
      idempotency: new IdempotencyKeyBuilder(),
    });
    const runId = 'mock-cancel-signal-1';
    await bootstrapRun(store, runId);
    const runRef = {
      provider: 'mock' as const,
      tenantId: 't',
      workflowId: `mock_${runId}`,
      runId,
    };

    await adapter.signal(runRef, {
      signalId: 'sig-mock-cancel-1',
      type: 'CANCEL',
      reason: 'operator-request',
    });

    expect((await store.listEvents('t', runId)).map((event) => event.eventType)).toEqual([
      'RunQueued',
      'RunCancelRequested',
      'RunCancelled',
    ]);
  });
});
