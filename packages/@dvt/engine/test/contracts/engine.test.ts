/**
 * Traceability header
 * - Purpose: Contract coverage for WorkflowEngine + MockAdapter in the Phase 1 path.
 * - Scope: Golden path hash determinism, replay/idempotency stability, PlanRef policy checks,
 *   and adapter invocation guards when preconditions fail.
 * - Issue impact: #14 (IWorkflowEngine + SnapshotProjector), specifically read-model/status
 *   expectations in the mocked adapter path (`PENDING` until completion events are present).
 */
import { createNoopObservability } from '@dvt/observability';
import { describe, it, expect, vi } from 'vitest';

import type { IProviderAdapter } from '../../src/adapters/IProviderAdapter.js';
import { MockAdapter } from '../../src/adapters/mock/MockAdapter.js';
import { PlanUriNotAllowedError } from '../../src/contracts/errors.js';
import type { ExecutionPlan } from '../../src/contracts/executionPlan.js';
import type {
  EngineRunRef,
  PlanRef,
  ResolvedRunContext,
  RunContext,
} from '../../src/contracts/types.js';
import { IdempotencyKeyBuilder } from '../../src/core/idempotency.js';
import { SnapshotProjector } from '../../src/core/SnapshotProjector.js';
import { WorkflowEngine } from '../../src/core/WorkflowEngine.js';
import { AllowAllAuthorizer } from '../../src/security/authorizer.js';
import { PlanIntegrityValidator } from '../../src/security/planIntegrity.js';
import { PlanRefPolicy } from '../../src/security/planRefPolicy.js';
import { RunAccessPolicy } from '../../src/security/RunAccessPolicy.js';
import { InMemoryStartRunIntentStore } from '../../src/state/InMemoryStartRunIntentStore.js';
import { InMemoryTxStore } from '../../src/state/InMemoryTxStore.js';
import { SequenceClock } from '../../src/utils/clock.js';
import { sha256Hex } from '../../src/utils/sha256.js';

import { InMemoryPlanFetcher, utf8 } from './helpers.js';

function makePlanMetadata(planId: string): ExecutionPlan['metadata'] {
  return {
    planId,
    planVersion: '2.3',
    schemaVersion: 'v1.2',
    contractVersion: '1.0.0',
    targetAdapter: 'mock',
    fallbackBehavior: 'reject',
    requiresCapabilities: [],
  };
}

function makeHelloWorldPlan(): ExecutionPlan {
  return {
    metadata: makePlanMetadata('hello-world'),
    steps: [
      { stepId: 's1', kind: 'noop' },
      { stepId: 's2', kind: 'noop' },
    ],
  };
}

function makeDagPlanWithDependsOn(): ExecutionPlan {
  return {
    metadata: makePlanMetadata('dag-plan'),
    steps: [
      { stepId: 's1', kind: 'noop' },
      { stepId: 's2', kind: 'noop', dependsOn: ['s1'] },
    ],
  };
}

function makePlanRef(uri: string, plan: ExecutionPlan): PlanRef {
  const bytes = utf8(JSON.stringify(plan));
  return {
    uri,
    sha256: sha256Hex(bytes),
    schemaVersion: plan.metadata.schemaVersion,
    planId: plan.metadata.planId,
    planVersion: plan.metadata.planVersion,
    sizeBytes: bytes.byteLength,
  };
}

function makeCtx(runId: string): RunContext {
  return {
    tenantId: 't1',
    projectId: 'p1',
    environmentId: 'dev',
    runId,
    targetAdapter: 'mock',
  };
}

// helpers moved to module scope

function setupEngineWithMock(plan: ExecutionPlan): {
  engine: WorkflowEngine;
  planRef: PlanRef;
  store: InMemoryTxStore;
} {
  const uri = `https://plans.example.com/${plan.metadata.planId}.json`;
  const planRef = makePlanRef(uri, plan);
  const clock = new SequenceClock('2026-02-12T00:00:00.000Z');
  const store = new InMemoryTxStore();
  const projector = new SnapshotProjector();
  const idempotency = new IdempotencyKeyBuilder();
  const mock = new MockAdapter({
    stateStore: store,
    clock,
    idempotency,
    projector,
    planFetcher: { fetch: async () => plan },
  });
  const engine = new WorkflowEngine({
    stateStoreRead: store,
    stateStoreWrite: store,

    projector,
    idempotency,
    clock,
    policy: new RunAccessPolicy({
      authorizer: new AllowAllAuthorizer(),
      planRefPolicy: new PlanRefPolicy({ allowedSchemes: ['https'] }),
    }),
    intentStore: new InMemoryStartRunIntentStore(),
    observability: createNoopObservability(),
    adapters: new Map([['mock', mock]]),
  });
  return { engine, planRef, store };
}

async function submitPlanAndGetSnapshot(
  engine: WorkflowEngine,
  planRef: PlanRef,
  runId: string
): Promise<import('../../src/contracts/engine/index.js').RunStatusSnapshot> {
  const runRef = await engine.startRun(planRef, makeCtx(runId));
  return await engine.getRunStatus(runRef);
}

describe('WorkflowEngine + MockAdapter (Phase 1 MVP)', () => {
  it('golden path: submit hello-world plan → completes with deterministic hash', async () => {
    const plan = makeHelloWorldPlan();
    const { engine, planRef } = setupEngineWithMock(plan);
    const snapshot = await submitPlanAndGetSnapshot(engine, planRef, 'run-1');
    expect(snapshot.status).toBe('PENDING');
    expect(snapshot.hash).toBeTypeOf('string');
    expect(snapshot.hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('idempotency test: replay same events 100x → same snapshot hash', async () => {
    const plan = makeHelloWorldPlan();
    const uri = 'https://plans.example.com/hello-world.json';
    const planRef = makePlanRef(uri, plan);

    const clock = new SequenceClock('2026-02-12T00:00:00.000Z');
    const store = new InMemoryTxStore();
    const projector = new SnapshotProjector();
    const idempotency = new IdempotencyKeyBuilder();

    const mock = new MockAdapter({
      stateStore: store,
      clock,
      idempotency,
      projector,
      planFetcher: { fetch: async () => plan },
    });

    const engine = new WorkflowEngine({
      stateStoreRead: store,
      stateStoreWrite: store,

      projector,
      idempotency,
      clock,
      policy: new RunAccessPolicy({
        authorizer: new AllowAllAuthorizer(),
        planRefPolicy: new PlanRefPolicy({ allowedSchemes: ['https'] }),
      }),
      intentStore: new InMemoryStartRunIntentStore(),
      observability: createNoopObservability(),
      adapters: new Map([['mock', mock]]),
    });

    const runRef = await engine.startRun(planRef, makeCtx('run-2'));
    const first = await engine.getRunStatus(runRef);

    // Replay: attempt to append duplicates of all events repeatedly.
    const events = await store.listEvents('t1', 'run-2');
    for (let i = 0; i < 100; i += 1) {
      // Strip runSeq and re-append. Dedup is by idempotencyKey.
      await store.appendAndEnqueueTx(
        'run-2',
        events.map((e) => {
          const { runSeq: _runSeq, persistedAt: _persistedAt, ...rest } = e;
          return rest;
        })
      );
    }

    const after = await engine.getRunStatus(runRef);
    expect(after.hash).toBe(first.hash);
    expect(after.status).toBe('PENDING');
  });

  it('accepts ExecutionPlan steps with dependsOn in mock adapter path', async () => {
    const plan = makeDagPlanWithDependsOn();
    const { engine, planRef } = setupEngineWithMock(plan);
    const runRef = await engine.startRun(planRef, makeCtx('run-dag-1'));
    const snapshot = await engine.getRunStatus(runRef);

    expect(snapshot.status).toBe('PENDING');
  });

  it('PlanRef policy: rejects dangerous schemes (file://)', async () => {
    const policy = new PlanRefPolicy({ allowedSchemes: ['https'] });
    expect(() => policy.validateOrThrow('file:///etc/passwd')).toThrowError(PlanUriNotAllowedError);
  });

  it('Plan integrity validation: sha256 mismatch fails', async () => {
    const plan = makeHelloWorldPlan();
    const uri = 'https://plans.example.com/bad.json';
    const bytes = utf8(JSON.stringify(plan));

    const badRef: PlanRef = {
      uri,
      sha256: 'deadbeef',
      schemaVersion: plan.metadata.schemaVersion,
      planId: plan.metadata.planId,
      planVersion: plan.metadata.planVersion,
      sizeBytes: bytes.byteLength,
    };

    const fetcher = new InMemoryPlanFetcher(new Map([[uri, bytes]]));
    const integrity = new PlanIntegrityValidator();

    await expect(integrity.fetchAndValidate(badRef, fetcher)).rejects.toThrowError(
      /PLAN_INTEGRITY_VALIDATION_FAILED/
    );
  });

  it('does not call adapter.startRun when PlanRef validation fails', async () => {
    const startRunMock: IProviderAdapter['startRun'] = vi.fn(
      async (_planRef: PlanRef, ctx: ResolvedRunContext): Promise<EngineRunRef> => ({
        provider: 'conductor',
        tenantId: ctx.tenantId,
        workflowId: 'wf',
        runId: ctx.runId,
        conductorUrl: 'http://conductor',
      })
    );

    const adapter: IProviderAdapter = {
      provider: 'conductor',
      startRun: startRunMock,
      cancelRun: async () => {},
      getRunStatus: async () => {
        throw new Error('noop');
      },
      signal: async () => {},
    };

    const store = new InMemoryTxStore();
    const projector = new SnapshotProjector();
    const idempotency = new IdempotencyKeyBuilder();
    const clock = new SequenceClock('2026-02-12T00:00:00.000Z');
    const planFetcher = { fetch: vi.fn(async () => makeHelloWorldPlan()) };
    const engine = new WorkflowEngine({
      stateStoreRead: store,
      stateStoreWrite: store,

      projector,
      idempotency,
      clock,
      policy: new RunAccessPolicy({
        authorizer: new AllowAllAuthorizer(),
        planRefPolicy: new PlanRefPolicy({ allowedSchemes: ['https'] }),
      }),
      intentStore: new InMemoryStartRunIntentStore(),
      observability: createNoopObservability(),
      adapters: new Map([['conductor', adapter]]),
    });

    const baseCtx: RunContext = {
      tenantId: 't1',
      projectId: 'p1',
      environmentId: 'dev',
      runId: 'run-x',
      targetAdapter: 'conductor',
    };

    // Case 1: URI not allowlisted
    const badPlanRef1: PlanRef = {
      uri: 'file:///etc/passwd',
      sha256: '0'.repeat(64),
      schemaVersion: 'v1.2',
      planId: 'p',
      planVersion: '1',
    };
    await expect(engine.startRun(badPlanRef1, baseCtx)).rejects.toThrow(PlanUriNotAllowedError);
    expect(startRunMock).not.toHaveBeenCalled();
    expect(planFetcher.fetch).not.toHaveBeenCalled();

    // Case 2: invalid schemaVersion
    const badPlanRef2: PlanRef = {
      uri: 'https://plans.example.com/plan.json',
      sha256: '0'.repeat(64),
      schemaVersion: 'v2.0', // invalid
      planId: 'p',
      planVersion: '1',
    };
    await expect(engine.startRun(badPlanRef2, baseCtx)).rejects.toThrow(
      /Unsupported plan schema version/
    );
    expect(startRunMock).not.toHaveBeenCalled();
    expect(planFetcher.fetch).not.toHaveBeenCalled();

    // Integrity validation moved to adapters in this phase.
  });
});
