import { asIsoUtcString, asNonBlankString } from '@dvt/contracts';
import type { RunMetadata } from '@dvt/engine';
import { IdempotencyKeyBuilder, SequenceClock } from '@dvt/engine/runtime';
import { describe, expect, it, vi } from 'vitest';

import { RunEventCancellationReceiptStore } from '../../../src/infrastructure/runControl/RunEventCancellationReceiptStore.js';

const RUN_METADATA: RunMetadata = {
  tenantId: 'tenant-a',
  projectId: 'project-a',
  environmentId: 'prod',
  runId: 'run-1',
  planId: 'plan-1',
  planVersion: '1.0.0',
  logicalAttemptId: 2,
  providerRef: {
    provider: 'temporal' as const,
    tenantId: asNonBlankString('tenant-a'),
    namespace: asNonBlankString('default'),
    workflowId: asNonBlankString('workflow-1'),
    runId: asNonBlankString('provider-run-1'),
  },
};

describe('RunEventCancellationReceiptStore', () => {
  it('persists and discovers the accepted command as a non-lifecycle run fact', async () => {
    const appendAndEnqueueTx = vi.fn().mockResolvedValue({
      appended: [],
      deduped: [],
      lastSeq: 1,
    });
    const listEvents = vi.fn().mockResolvedValue([]);
    const store = new RunEventCancellationReceiptStore({
      stateStoreRead: { listEvents } as never,
      stateStoreWrite: { appendAndEnqueueTx } as never,
      clock: new SequenceClock(asIsoUtcString('2026-08-02T04:00:00.000Z')),
      idempotency: new IdempotencyKeyBuilder(),
    });

    await expect(store.hasAccepted({ tenantId: 'tenant-a', runId: 'run-1' })).resolves.toBe(false);
    await store.recordAccepted(RUN_METADATA);

    const submitted = appendAndEnqueueTx.mock.calls[0]?.[1]?.[0];
    expect(submitted).toMatchObject({
      eventType: 'RunCancelSubmitted',
      emittedAt: '2026-08-02T04:00:00.000Z',
      tenantId: 'tenant-a',
      runId: 'run-1',
      logicalAttemptId: 2,
    });

    listEvents.mockResolvedValueOnce([
      { ...submitted, runSeq: 2, persistedAt: submitted.emittedAt },
    ]);
    await expect(store.hasAccepted({ tenantId: 'tenant-a', runId: 'run-1' })).resolves.toBe(true);
  });
});
