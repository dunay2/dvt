import { describe, expect, test } from 'vitest';

import { PostgresStateStoreAdapter } from '../src/index.js';

describe('adapter-postgres foundation', () => {
  test('stores run metadata and returns it by runId', async () => {
    const adapter = new PostgresStateStoreAdapter({
      connectionString: 'postgresql://localhost:5432/dvt_test',
      schema: 'dvt',
    });

    await adapter.saveRunMetadata({
      tenantId: 't1',
      projectId: 'p1',
      environmentId: 'dev',
      runId: 'run-1',
      provider: 'mock',
      providerWorkflowId: 'wf-1',
      providerRunId: 'pr-1',
    });

    await expect(adapter.getRunMetadataByRunId('run-1')).resolves.toMatchObject({
      runId: 'run-1',
      provider: 'mock',
    });
  });

  test('applies idempotency when appending events', async () => {
    const adapter = new PostgresStateStoreAdapter();

    const base = {
      eventType: 'RunStarted' as const,
      emittedAt: '2026-02-15T22:00:00.000Z' as const,
      tenantId: 't1',
      projectId: 'p1',
      environmentId: 'dev',
      runId: 'run-2',
      engineAttemptId: 1,
      logicalAttemptId: 1,
      idempotencyKey: 'k-1',
    };

    const first = await adapter.appendEventsTx('run-2', [base]);
    const second = await adapter.appendEventsTx('run-2', [base]);

    expect(first.appended).toHaveLength(1);
    expect(first.appended[0]?.runSeq).toBe(1);
    expect(second.appended).toHaveLength(0);
    expect(second.deduped).toHaveLength(1);
    await expect(adapter.listEvents('run-2')).resolves.toHaveLength(1);
  });

  test('enqueues outbox entries and supports failure/delivery lifecycle', async () => {
    const adapter = new PostgresStateStoreAdapter();

    const { appended } = await adapter.appendEventsTx('run-3', [
      {
        eventType: 'RunQueued',
        emittedAt: '2026-02-15T22:00:00.000Z',
        tenantId: 't1',
        projectId: 'p1',
        environmentId: 'dev',
        runId: 'run-3',
        engineAttemptId: 1,
        logicalAttemptId: 1,
        idempotencyKey: 'k-queued',
      },
    ]);

    await adapter.enqueueTx('run-3', appended);
    const pending = await adapter.listPending(10);
    expect(pending).toHaveLength(1);

    const id = pending[0]?.id;
    expect(id).toBeTruthy();

    await adapter.markFailed(id!, 'temporary error');
    const failed = await adapter.listPending(10);
    expect(failed[0]?.attempts).toBe(1);
    expect(failed[0]?.lastError).toBe('temporary error');

    await adapter.markDelivered([id!]);
    await expect(adapter.listPending(10)).resolves.toHaveLength(0);
  });
});
