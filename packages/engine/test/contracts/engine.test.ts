import { describe, it, expect } from 'vitest';
import { vi } from 'vitest';

import type { IProviderAdapter } from '../../src/adapters/IProviderAdapter.js';
import { MockAdapter } from '../../src/adapters/mock/MockAdapter.js';
import type { ExecutionPlan } from '../../src/contracts/executionPlan.js';
import type { PlanRef, RunContext } from '../../src/contracts/types.js';
import { IdempotencyKeyBuilder } from '../../src/core/idempotency.js';
import { SnapshotProjector } from '../../src/core/SnapshotProjector.js';
import { WorkflowEngine } from '../../src/core/WorkflowEngine.js';
import { AllowAllAuthorizer } from '../../src/security/authorizer.js';
import { PlanIntegrityValidator } from '../../src/security/planIntegrity.js';
import { PlanRefPolicy } from '../../src/security/planRefPolicy.js';
import { InMemoryTxStore } from '../../src/state/InMemoryTxStore.js';
import { SequenceClock } from '../../src/utils/clock.js';
import { sha256Hex } from '../../src/utils/sha256.js';

import { InMemoryPlanFetcher, utf8 } from './helpers.js';

function makeHelloWorldPlan(): ExecutionPlan {
  return {
    metadata: {
      planId: 'hello-world',
      planVersion: '1.0.0',
      schemaVersion: 'v1.2',
      targetAdapter: 'mock',
      fallbackBehavior: 'reject',
      requiresCapabilities: ['basic-execution'],
    },
    steps: [
      { stepId: 's1', kind: 'noop' },
      { stepId: 's2', kind: 'noop' },
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

describe('WorkflowEngine + MockAdapter (Phase 1 MVP)', () => {
  it('golden path: submit hello-world plan → completes with deterministic hash', async () => {
    const plan = makeHelloWorldPlan();
    const uri = 'https://plans.example.com/hello-world.json';
    const planRef = makePlanRef(uri, plan);

    const fetcher = new InMemoryPlanFetcher(new Map([[uri, utf8(JSON.stringify(plan))]]));

    const clock = new SequenceClock('2026-02-12T00:00:00.000Z');
    const store = new InMemoryTxStore();
    const projector = new SnapshotProjector();
    const idempotency = new IdempotencyKeyBuilder();

    const mock = new MockAdapter({
      stateStore: store,
      outbox: store,
      clock,
      idempotency,
      projector,
      fetcher,
      integrity: new PlanIntegrityValidator(),
    });

    const engine = new WorkflowEngine({
      stateStore: store,
      outbox: store,
      projector,
      idempotency,
      clock,
      authorizer: new AllowAllAuthorizer(),
      planRefPolicy: new PlanRefPolicy({ allowedSchemes: ['https'] }),
      planIntegrity: new PlanIntegrityValidator(),
      planFetcher: fetcher,
      adapters: new Map([['mock', mock]]),
    });

    const runRef = await engine.startRun(planRef, makeCtx('run-1'));
    const snapshot = await engine.getRunStatus(runRef);

    expect(snapshot.status).toBe('COMPLETED');
    expect(snapshot.hash).toBeTypeOf('string');

    // Stable snapshot hash (acts as determinism canary)
    expect(snapshot.hash).toMatchInlineSnapshot(
      '"a15315ec9d197acf56af5fd07ee373243259e8e882ff38c08faf09ea3e6092b1"'
    );
  });

  it('idempotency test: replay same events 100x → same snapshot hash', async () => {
    const plan = makeHelloWorldPlan();
    const uri = 'https://plans.example.com/hello-world.json';
    const planRef = makePlanRef(uri, plan);

    const fetcher = new InMemoryPlanFetcher(new Map([[uri, utf8(JSON.stringify(plan))]]));

    const clock = new SequenceClock('2026-02-12T00:00:00.000Z');
    const store = new InMemoryTxStore();
    const projector = new SnapshotProjector();
    const idempotency = new IdempotencyKeyBuilder();

    const mock = new MockAdapter({
      stateStore: store,
      outbox: store,
      clock,
      idempotency,
      projector,
      fetcher,
      integrity: new PlanIntegrityValidator(),
    });

    const engine = new WorkflowEngine({
      stateStore: store,
      outbox: store,
      projector,
      idempotency,
      clock,
      authorizer: new AllowAllAuthorizer(),
      planRefPolicy: new PlanRefPolicy({ allowedSchemes: ['https'] }),
      planIntegrity: new PlanIntegrityValidator(),
      planFetcher: fetcher,
      adapters: new Map([['mock', mock]]),
    });

    const runRef = await engine.startRun(planRef, makeCtx('run-2'));
    const first = await engine.getRunStatus(runRef);

    // Replay: attempt to append duplicates of all events repeatedly.
    const events = await store.listEvents('run-2');
    for (let i = 0; i < 100; i += 1) {
      // Strip runSeq and re-append. Dedup is by idempotencyKey.
      await store.appendEventsTx(
        'run-2',
        events.map((e) => {
          const { runSeq: _runSeq, ...rest } = e;
          return rest;
        })
      );
    }

    const after = await engine.getRunStatus(runRef);
    expect(after.hash).toBe(first.hash);
    expect(after.status).toBe('COMPLETED');
  });

  it('PlanRef policy: rejects dangerous schemes (file://)', async () => {
    const policy = new PlanRefPolicy({ allowedSchemes: ['https'] });
    expect(() => policy.validateOrThrow('file:///etc/passwd')).toThrowError(/PLAN_URI_NOT_ALLOWED/);
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
    const startRunMock = vi.fn(async (_planRef: PlanRef, ctx: RunContext) => ({
      provider: 'conductor',
      workflowId: 'wf',
      runId: ctx.runId,
      conductorUrl: 'http://conductor',
    }));

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
    const authorizer = new AllowAllAuthorizer();
    const planRefPolicy = new PlanRefPolicy({ allowedSchemes: ['https'] });
    const planIntegrity = new PlanIntegrityValidator();
    const planFetcher = new InMemoryPlanFetcher(new Map());

    const engine = new WorkflowEngine({
      stateStore: store,
      outbox: store,
      projector,
      idempotency,
      clock,
      authorizer,
      planRefPolicy,
      planIntegrity,
      planFetcher,
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
    await expect(engine.startRun(badPlanRef1, baseCtx)).rejects.toThrow(/PLAN_URI_NOT_ALLOWED/);
    expect(startRunMock).not.toHaveBeenCalled();

    // Case 2: invalid schemaVersion
    const badPlanRef2: PlanRef = {
      uri: 'https://plans.example.com/plan.json',
      sha256: '0'.repeat(64),
      schemaVersion: 'v2.0', // invalid
      planId: 'p',
      planVersion: '1',
    };
    await expect(engine.startRun(badPlanRef2, baseCtx)).rejects.toThrow(
      /PLAN_SCHEMA_VERSION_UNKNOWN/
    );
    expect(startRunMock).not.toHaveBeenCalled();

    // Case 3: sha256 mismatch
    const plan = makeHelloWorldPlan();
    const uri = 'https://plans.example.com/plan.json';
    const bytes = utf8(JSON.stringify(plan));
    const badPlanRef3: PlanRef = {
      uri,
      sha256: 'deadbeef',
      schemaVersion: plan.metadata.schemaVersion,
      planId: plan.metadata.planId,
      planVersion: plan.metadata.planVersion,
      sizeBytes: bytes.byteLength,
    };
    const planFetcher3 = new InMemoryPlanFetcher(new Map([[uri, bytes]]));
    const engine3 = new WorkflowEngine({
      stateStore: store,
      outbox: store,
      projector,
      idempotency,
      clock,
      authorizer,
      planRefPolicy,
      planIntegrity,
      planFetcher: planFetcher3,
      adapters: new Map([['conductor', adapter]]),
    });
    await expect(engine3.startRun(badPlanRef3, baseCtx)).rejects.toThrow(
      /PLAN_INTEGRITY_VALIDATION_FAILED/
    );
    expect(startRunMock).not.toHaveBeenCalled();
  });
});
