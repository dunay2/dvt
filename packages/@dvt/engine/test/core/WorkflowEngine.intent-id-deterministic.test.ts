import type { EngineRunRef, PlanRef, RunContext, RunStatusSnapshot } from '@dvt/contracts';
import { createNoopObservability } from '@dvt/observability';
import { describe, expect, it, vi } from 'vitest';

import type { IProviderAdapter } from '../../src/adapters/IProviderAdapter.js';
import { IdempotencyKeyBuilder } from '../../src/core/idempotency.js';
import { SnapshotProjector } from '../../src/core/SnapshotProjector.js';
import { WorkflowEngine } from '../../src/core/WorkflowEngine.js';
import { AllowAllAuthorizer } from '../../src/security/authorizer.js';
import { PlanRefPolicy } from '../../src/security/planRefPolicy.js';
import { RunAccessPolicy } from '../../src/security/RunAccessPolicy.js';
import { InMemoryStartRunIntentStore } from '../../src/state/InMemoryStartRunIntentStore.js';
import { InMemoryTxStore } from '../../src/state/InMemoryTxStore.js';
import { SequenceClock } from '../../src/utils/clock.js';

function makePlanRef(): PlanRef {
  return {
    uri: 'https://example.com/plan',
    sha256: 'deadbeef',
    schemaVersion: 'v1.1',
    planId: 'p',
    planVersion: '1.0',
  };
}

function makeContext(
  runId = 'r1',
  overrides?: Partial<Pick<RunContext, 'logicalAttemptId' | 'targetAdapter'>>
): RunContext {
  return {
    tenantId: 't',
    projectId: 'p',
    environmentId: 'dev',
    runId,
    targetAdapter: 'temporal',
    ...(overrides ?? {}),
  };
}

function makeTemporalAdapter(): IProviderAdapter {
  return {
    provider: 'temporal',
    async startRun(_planRef: PlanRef, ctx) {
      return {
        provider: 'temporal',
        tenantId: ctx.tenantId,
        namespace: 'default',
        workflowId: `wf-${ctx.runId}`,
        runId: ctx.runId,
      } as EngineRunRef;
    },
    async cancelRun() {},
    async getRunStatus(runRef) {
      return { runId: runRef.runId, status: 'RUNNING' } as RunStatusSnapshot;
    },
    async signal() {},
  };
}

function createEngine(): { engine: WorkflowEngine; intentStore: InMemoryStartRunIntentStore } {
  const intentStore = new InMemoryStartRunIntentStore();
  const store = new InMemoryTxStore();
  const engine = new WorkflowEngine({
    stateStoreRead: store,
    stateStoreWrite: store,
    projector: new SnapshotProjector(),
    idempotency: new IdempotencyKeyBuilder(),
    clock: new SequenceClock('2026-03-01T00:00:00.000Z'),
    policy: new RunAccessPolicy({
      authorizer: new AllowAllAuthorizer(),
      planRefPolicy: new PlanRefPolicy({ allowedSchemes: ['https'] }),
    }),
    intentStore,
    observability: createNoopObservability(),
    adapters: new Map<EngineRunRef['provider'], IProviderAdapter>([
      ['temporal', makeTemporalAdapter()],
    ]),
  });
  return { engine, intentStore };
}

describe('WorkflowEngine startRun intent id determinism', () => {
  it('uses deterministic intent id derived from tenant, run, attempt, and adapter', async () => {
    const { engine, intentStore } = createEngine();
    const createSpy = vi.spyOn(intentStore, 'createIntent');
    const builder = new IdempotencyKeyBuilder();

    await engine.startRun(makePlanRef(), makeContext('deterministic-run-1'));

    const created = createSpy.mock.calls[0]?.[0];
    expect(created?.intentId).toBe(
      builder.startRunIntentId('t', 'deterministic-run-1', 1, 'temporal')
    );
  });

  it('uses logicalAttemptId from RunContext when present', async () => {
    const { engine, intentStore } = createEngine();
    const createSpy = vi.spyOn(intentStore, 'createIntent');
    const builder = new IdempotencyKeyBuilder();

    await engine.startRun(makePlanRef(), makeContext('attempted-run-1', { logicalAttemptId: 2 }));

    const created = createSpy.mock.calls[0]?.[0];
    expect(created?.intentId).toBe(builder.startRunIntentId('t', 'attempted-run-1', 2, 'temporal'));
  });

  it('derivation is stable for the same tenantId, runId, attempt, and adapter', () => {
    const builder = new IdempotencyKeyBuilder();
    const first = builder.startRunIntentId('tenant-a', 'run-123', 1, 'temporal');
    const second = builder.startRunIntentId('tenant-a', 'run-123', 1, 'temporal');
    const differentTenant = builder.startRunIntentId('tenant-b', 'run-123', 1, 'temporal');
    const differentAttempt = builder.startRunIntentId('tenant-a', 'run-123', 2, 'temporal');
    const differentAdapter = builder.startRunIntentId('tenant-a', 'run-123', 1, 'conductor');

    expect(first).toBe(second);
    expect(first).not.toBe(differentTenant);
    expect(first).not.toBe(differentAttempt);
    expect(first).not.toBe(differentAdapter);
  });
});
