import type { EngineRunRef, RunStatusSnapshot } from '@dvt/contracts';
import { createNoopObservability } from '@dvt/observability';
import { describe, expect, it } from 'vitest';

import type { IProviderAdapter } from '../../src/adapters/IProviderAdapter.js';
import { IdempotencyKeyBuilder } from '../../src/core/idempotency.js';
import { SnapshotProjector } from '../../src/core/SnapshotProjector.js';
import { WorkflowEngineCoreService } from '../../src/core/WorkflowEngineCoreService.js';
import { AllowAllAuthorizer } from '../../src/security/authorizer.js';
import { PlanRefPolicy } from '../../src/security/planRefPolicy.js';
import { RunAccessPolicy } from '../../src/security/RunAccessPolicy.js';
import { InMemoryTxStore } from '../../src/state/InMemoryTxStore.js';
import { SequenceClock } from '../../src/utils/clock.js';

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
  core: WorkflowEngineCoreService;
  store: InMemoryTxStore;
  adapter: IProviderAdapter;
} {
  const store = new InMemoryTxStore();
  const adapter = makeAdapter(input?.adapterOverrides);
  const core = new WorkflowEngineCoreService({
    stateStoreRead: store,
    stateStoreWrite: store,
    projector: new SnapshotProjector(),
    idempotency: new IdempotencyKeyBuilder(),
    policy: new RunAccessPolicy({
      authorizer: new AllowAllAuthorizer(),
      planRefPolicy: new PlanRefPolicy({ allowedSchemes: ['https'] }),
    }),
    adapters: new Map([['temporal', adapter]]),
    observability: createNoopObservability(),
    clock: new SequenceClock('2026-03-26T00:00:00.000Z'),
  });
  return { core, store, adapter };
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
        emittedAt: '2026-03-26T00:00:00.000Z',
        idempotencyKey: `${runId}:queued`,
        payloadVersion: 1,
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
});
