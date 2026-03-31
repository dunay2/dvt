import type { EngineRunRef, RunStatusSnapshot } from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import type { IProviderAdapter } from '../../src/adapters/IProviderAdapter.js';
import { InMemoryTxStore } from '../../src/state/InMemoryTxStore.js';
import { createWorkflowEngineCoreFixture } from '../helpers/workflowEngine.fixture.js';

function makeAdapter(overrides?: Partial<IProviderAdapter>): IProviderAdapter {
  const base: IProviderAdapter = {
    provider: 'temporal',
    async startRun() {
      throw new Error('unused in core tests');
    },
    async cancelRun() {},
    async getRunStatus(runRef) {
      return { runId: runRef.runId, status: 'RUNNING' } as RunStatusSnapshot;
    },
    async signal() {},
  };
  return overrides ? { ...base, ...overrides } : base;
}

function makeCore(input?: { adapterOverrides?: Partial<IProviderAdapter> }): {
  core: ReturnType<typeof createWorkflowEngineCoreFixture>['core'];
  store: InMemoryTxStore;
  adapter: IProviderAdapter;
} {
  const adapter = makeAdapter(input?.adapterOverrides);
  const fixture = createWorkflowEngineCoreFixture({ adapter });
  return { core: fixture.core, store: fixture.store, adapter: fixture.adapter };
}

async function bootstrapRun(store: InMemoryTxStore, runId: string): Promise<EngineRunRef> {
  await store.bootstrapRunTx({
    metadata: {
      tenantId: 't',
      projectId: 'p',
      environmentId: 'dev',
      runId,
      planId: 'plan-1',
      planVersion: '1.0',
      logicalAttemptId: 1,
      provider: 'temporal',
      providerWorkflowId: `wf-${runId}`,
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
        emittedAt: '2026-03-26T00:00:00.000Z',
        idempotencyKey: `${runId}:queued`,
      },
    ],
  });
  return {
    provider: 'temporal',
    tenantId: 't',
    namespace: 'default',
    workflowId: `wf-${runId}`,
    runId,
  };
}

describe('WorkflowEngineCoreService', () => {
  it('cancel throws when run metadata is missing', async () => {
    const { core } = makeCore();
    await expect(
      core.cancel({
        provider: 'temporal',
        tenantId: 't',
        namespace: 'default',
        workflowId: 'wf-missing',
        runId: 'missing',
      })
    ).rejects.toThrow(/engine\.error\.run_metadata_not_found/);
  });

  it('getStatus returns projected state without calling adapter', async () => {
    let adapterCalled = false;
    const { core, store } = makeCore({
      adapterOverrides: {
        async getRunStatus() {
          adapterCalled = true;
          return { runId: 'x', status: 'RUNNING' } as RunStatusSnapshot;
        },
      },
    });
    const ref = await bootstrapRun(store, 'core-status-1');
    const snapshot = await core.getStatus(ref);

    expect(adapterCalled).toBe(false);
    expect(snapshot.runId).toBe('core-status-1');
    expect(snapshot.status).toBe('PENDING');
  });

  it('enrichStatus merges adapter substatus and message over projected base', async () => {
    const { core, store } = makeCore({
      adapterOverrides: {
        async getRunStatus(runRef) {
          return {
            runId: runRef.runId,
            status: 'RUNNING',
            substatus: 'DRAINING',
            message: 'graceful shutdown in progress',
          } as RunStatusSnapshot;
        },
      },
    });
    const ref = await bootstrapRun(store, 'core-enrich-1');
    const enriched = await core.enrichStatus(ref);

    expect(enriched.runId).toBe('core-enrich-1');
    expect(enriched.status).toBe('PENDING');
    expect(enriched.substatus).toBe('DRAINING');
    expect(enriched.message).toBe('graceful shutdown in progress');
  });

  it('enrichStatus throws when adapter status fetch fails', async () => {
    const { core, store } = makeCore({
      adapterOverrides: {
        async getRunStatus() {
          throw new Error('provider unavailable');
        },
      },
    });
    const ref = await bootstrapRun(store, 'core-enrich-err-1');
    await expect(core.enrichStatus(ref)).rejects.toThrow(/provider unavailable/);
  });

  it('cancel delegates to adapter without appending RunCancelRequested', async () => {
    const cancelRun = vi.fn(async () => {});
    const { core, store } = makeCore({
      adapterOverrides: {
        cancelRun,
      },
    });
    const ref = await bootstrapRun(store, 'core-cancel-1');

    await core.cancel(ref);

    expect(cancelRun).toHaveBeenCalledTimes(1);
    expect(cancelRun).toHaveBeenCalledWith(ref);
    expect((await store.listEvents('t', 'core-cancel-1')).map((event) => event.eventType)).toEqual([
      'RunQueued',
    ]);
  });

  it('signal(CANCEL) delegates to adapter without appending RunCancelRequested', async () => {
    const signal = vi.fn(async () => {});
    const { core, store } = makeCore({
      adapterOverrides: {
        signal,
      },
    });
    const ref = await bootstrapRun(store, 'core-signal-cancel-1');

    await core.signal(ref, {
      signalId: 'sig-cancel-1',
      type: 'CANCEL',
      reason: 'operator-request',
    });

    expect(signal).toHaveBeenCalledTimes(1);
    expect(signal).toHaveBeenCalledWith(ref, {
      signalId: 'sig-cancel-1',
      type: 'CANCEL',
      reason: 'operator-request',
    });
    expect(
      (await store.listEvents('t', 'core-signal-cancel-1')).map((event) => event.eventType)
    ).toEqual(['RunQueued']);
  });

  it('signal(PAUSE) then signal(RESUME) still append engine-owned lifecycle events', async () => {
    const signal = vi.fn(async () => {});
    const { core, store } = makeCore({
      adapterOverrides: {
        signal,
      },
    });
    const ref = await bootstrapRun(store, 'core-signal-pause-resume-1');

    await core.signal(ref, {
      signalId: 'sig-pause-1',
      type: 'PAUSE',
    });
    await core.signal(ref, {
      signalId: 'sig-resume-1',
      type: 'RESUME',
    });

    expect(signal).toHaveBeenCalledTimes(2);
    expect(
      (await store.listEvents('t', 'core-signal-pause-resume-1')).map((event) => event.eventType)
    ).toEqual(['RunQueued', 'RunPaused', 'RunResumed']);
  });
});
