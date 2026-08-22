/**
 * Traceability header
 * - Purpose: Contract coverage for WorkflowEngine + in-memory temporal provider test double.
 * - Scope: Golden path hash determinism, replay/idempotency stability, PlanRef policy checks,
 *   and adapter invocation guards when preconditions fail.
 * - Issue impact: #14 (IWorkflowEngine + SnapshotProjector), specifically read-model/status
 *   expectations in the provider adapter path (`PENDING` until completion events are present).
 */
import { CURRENT_SIGNAL_SEMANTICS_VERSION, type ScopedPlanRef } from '@dvt/contracts';
import { jcsCanonicalize } from '@dvt/crypto';
import { createNoopObservability } from '@dvt/observability';
import { describe, it, expect, vi } from 'vitest';

import { InMemoryProviderAdapter } from '../../src/adapters/inMemory/InMemoryProviderAdapter.js';
import type { IProviderAdapter } from '../../src/adapters/IProviderAdapter.js';
import { ENGINE_ERROR_MESSAGE_KEY, PlanUriNotAllowedError } from '../../src/contracts/errors.js';
import type { ExecutionPlan } from '../../src/contracts/executionPlan.js';
import type {
  EngineRunRef,
  PlanRef,
  ResolvedRunContext,
  RunContext,
} from '../../src/contracts/types.js';
import { IdempotencyKeyBuilder } from '../../src/core/idempotency.js';
import { SnapshotProjector } from '../../src/core/SnapshotProjector.js';
import { PlanIntegrityValidator } from '../../src/security/planIntegrity.js';
import { PlanRefPolicy } from '../../src/security/planRefPolicy.js';
import { InMemoryTxStore } from '../../src/state/InMemoryTxStore.js';
import { SequenceClock } from '../../src/utils/clock.js';
import { sha256Hex, sha256HexUtf8 } from '../../src/utils/sha256.js';
import {
  createWorkflowEngineFixture,
  makePlanFetcherForPlan,
  makeProviderMap,
} from '../helpers/workflowEngine.fixture.js';

import { InMemoryPlanFetcher, utf8 } from './helpers.js';

function derivePlanId(
  steps: ExecutionPlan['steps'],
  inputHashSha256 = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
): string {
  return sha256HexUtf8(
    jcsCanonicalize({
      metadata: {
        planVersion: '1.0',
        inputHashSha256,
      },
      steps,
    })
  );
}

function makePlanMetadata(
  steps: ExecutionPlan['steps'],
  inputHashSha256 = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
): ExecutionPlan['metadata'] {
  return {
    planId: derivePlanId(steps, inputHashSha256),
    planVersion: '1.0',
    schemaVersion: '1.0',
    contractVersion: '1.0.0',
    inputHashSha256,
    createdAtIso: '2026-02-12T00:00:00.000Z',
  };
}

function makeHelloWorldPlan(): ExecutionPlan {
  const steps: ExecutionPlan['steps'] = [
    { stepId: 's1', kind: 'noop', dependsOn: [] },
    { stepId: 's2', kind: 'noop', dependsOn: [] },
  ];
  return {
    metadata: makePlanMetadata(steps),
    steps,
  };
}

function makeDagPlanWithDependsOn(): ExecutionPlan {
  const steps: ExecutionPlan['steps'] = [
    { stepId: 's1', kind: 'noop', dependsOn: [] },
    { stepId: 's2', kind: 'noop', dependsOn: ['s1'] },
  ];
  return {
    metadata: makePlanMetadata(steps),
    steps,
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
    targetAdapter: 'temporal',
  };
}

function makeScopedPlanRef(planRef: PlanRef): ScopedPlanRef {
  return {
    tenantId: 't1',
    projectId: 'p1',
    environmentId: 'dev',
    planRef,
  };
}

// helpers moved to module scope

function setupEngineWithInMemoryProvider(plan: ExecutionPlan): {
  engine: ReturnType<typeof createWorkflowEngineFixture>['engine'];
  planRef: PlanRef;
  store: InMemoryTxStore;
} {
  const uri = `https://plans.example.com/${plan.metadata.planId}.json`;
  const planRef = makePlanRef(uri, plan);
  const clock = new SequenceClock('2026-02-12T00:00:00.000Z');
  const store = new InMemoryTxStore();
  const projector = new SnapshotProjector();
  const idempotency = new IdempotencyKeyBuilder();
  const adapter = new InMemoryProviderAdapter({
    stateStore: store,
    stateStoreWrite: store,
    clock,
    idempotency,
    projector,
  });
  const { engine } = createWorkflowEngineFixture({
    stateStore: store,
    projector,
    idempotency,
    clock,
    observability: createNoopObservability(),
    adapters: makeProviderMap(adapter),
    planFetcher: makePlanFetcherForPlan(plan),
  });
  return { engine, planRef, store };
}

async function submitPlanAndGetSnapshot(
  engine: ReturnType<typeof createWorkflowEngineFixture>['engine'],
  planRef: PlanRef,
  runId: string
): Promise<import('../../src/contracts/engine/index.js').CanonicalRunStatus> {
  const runRef = await engine.startRun(planRef, makeCtx(runId));
  return await engine.getRunStatus(runRef);
}

describe('WorkflowEngine + in-memory temporal provider adapter', () => {
  it('golden path: submit hello-world plan → returns pending snapshot', async () => {
    const plan = makeHelloWorldPlan();
    const { engine, planRef } = setupEngineWithInMemoryProvider(plan);
    const snapshot = await submitPlanAndGetSnapshot(engine, planRef, 'run-1');
    expect(snapshot.status).toBe('PENDING');
  });

  it('idempotency test: replay same events 100x → same snapshot status', async () => {
    const plan = makeHelloWorldPlan();
    const uri = 'https://plans.example.com/hello-world.json';
    const planRef = makePlanRef(uri, plan);

    const clock = new SequenceClock('2026-02-12T00:00:00.000Z');
    const store = new InMemoryTxStore();
    const projector = new SnapshotProjector();
    const idempotency = new IdempotencyKeyBuilder();

    const adapter = new InMemoryProviderAdapter({
      stateStore: store,
      stateStoreWrite: store,
      clock,
      idempotency,
      projector,
    });

    const { engine } = createWorkflowEngineFixture({
      stateStore: store,
      projector,
      idempotency,
      clock,
      observability: createNoopObservability(),
      adapters: makeProviderMap(adapter),
      planFetcher: makePlanFetcherForPlan(plan),
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
    expect(after.status).toBe('PENDING');
    expect(first.status).toBe('PENDING');
  });

  it('accepts ExecutionPlan steps with dependsOn in provider adapter path', async () => {
    const plan = makeDagPlanWithDependsOn();
    const { engine, planRef } = setupEngineWithInMemoryProvider(plan);
    const runRef = await engine.startRun(planRef, makeCtx('run-dag-1'));
    const snapshot = await engine.getRunStatus(runRef);

    expect(snapshot.status).toBe('PENDING');
  });

  it('PlanRef policy: rejects dangerous schemes (file://)', async () => {
    const policy = new PlanRefPolicy({ allowedSchemes: ['https'] });
    expect(() => policy.validateOrThrow('file:///etc/passwd')).toThrowError(PlanUriNotAllowedError);
  });

  it('Plan integrity validation: planId mismatch against fetched bytes fails', async () => {
    const plan = makeHelloWorldPlan();
    const uri = 'https://plans.example.com/bad.json';
    const tamperedPlan: ExecutionPlan = {
      ...plan,
      steps: [...plan.steps, { stepId: 's3', kind: 'noop', dependsOn: [] }],
      metadata: {
        ...plan.metadata,
      },
    };
    const bytes = utf8(JSON.stringify(tamperedPlan));

    const badRef: PlanRef = {
      uri,
      sha256: sha256Hex(bytes),
      schemaVersion: plan.metadata.schemaVersion,
      planId: plan.metadata.planId,
      planVersion: plan.metadata.planVersion,
      sizeBytes: bytes.byteLength,
    };

    const fetcher = new InMemoryPlanFetcher(new Map([[uri, bytes]]));
    const integrity = new PlanIntegrityValidator({
      clock: new SequenceClock('2026-02-12T00:00:00.000Z'),
    });

    await expect(
      integrity.fetchAndValidate(makeScopedPlanRef(badRef), fetcher)
    ).rejects.toThrowError(/PLAN_ID_MISMATCH/);
  });

  it('Plan integrity validation: sha256 mismatch against fetched bytes fails before planId checks', async () => {
    const plan = makeHelloWorldPlan();
    const uri = 'https://plans.example.com/bad-sha.json';
    const bytes = utf8(JSON.stringify(plan));

    const badRef: PlanRef = {
      uri,
      sha256: '0'.repeat(64),
      schemaVersion: plan.metadata.schemaVersion,
      planId: plan.metadata.planId,
      planVersion: plan.metadata.planVersion,
      sizeBytes: bytes.byteLength,
    };

    const fetcher = new InMemoryPlanFetcher(new Map([[uri, bytes]]));
    const integrity = new PlanIntegrityValidator({
      clock: new SequenceClock('2026-02-12T00:00:00.000Z'),
    });

    await expect(
      integrity.fetchAndValidate(makeScopedPlanRef(badRef), fetcher)
    ).rejects.toThrowError(/PLAN_INTEGRITY_VALIDATION_FAILED/);
  });

  it('Plan integrity validation: expired PlanRef fails before provider dispatch', async () => {
    const plan = makeHelloWorldPlan();
    const uri = 'https://plans.example.com/expired-plan.json';
    const bytes = utf8(JSON.stringify(plan));

    const expiredRef: PlanRef = {
      uri,
      sha256: sha256Hex(bytes),
      schemaVersion: plan.metadata.schemaVersion,
      planId: plan.metadata.planId,
      planVersion: plan.metadata.planVersion,
      sizeBytes: bytes.byteLength,
      expiresAt: '2026-01-01T00:00:00.000Z',
    };

    const fetcher = new InMemoryPlanFetcher(new Map([[uri, bytes]]));
    const integrity = new PlanIntegrityValidator({
      clock: { nowIsoUtc: () => '2026-04-30T00:00:00.000Z' },
    });

    await expect(
      integrity.fetchAndValidate(makeScopedPlanRef(expiredRef), fetcher)
    ).rejects.toThrowError(/PLAN_REF_EXPIRED/);
  });

  it('does not call adapter.startRun when PlanRef validation fails', async () => {
    const startRunMock: IProviderAdapter['startRun'] = vi.fn(
      async (_planRef: PlanRef, ctx: ResolvedRunContext): Promise<EngineRunRef> => ({
        provider: 'temporal',
        tenantId: ctx.tenantId,
        namespace: 'default',
        workflowId: 'wf',
        runId: ctx.runId,
      })
    );

    const adapter: IProviderAdapter = {
      provider: 'temporal',
      startRun: startRunMock,
      cancelRun: async () => {},
      getProviderStatusView: async () => {
        throw new Error('noop');
      },
      signal: async () => {},
      signalSemanticsVersions: () => [CURRENT_SIGNAL_SEMANTICS_VERSION],
    };

    const store = new InMemoryTxStore();
    const projector = new SnapshotProjector();
    const idempotency = new IdempotencyKeyBuilder();
    const clock = new SequenceClock('2026-02-12T00:00:00.000Z');
    const planFetcher = {
      getStoredPlanValidationRecord: vi.fn(async () => undefined),
      fetchStoredPlanArtifact: vi.fn(async () => ({
        bytes: utf8(JSON.stringify(makeHelloWorldPlan())),
        executionPolicy: {},
      })),
      fetchStoredPlanArtifactForValidation: vi.fn(async () => ({
        bytes: utf8(JSON.stringify(makeHelloWorldPlan())),
        executionPolicy: {},
      })),
    };
    const { engine } = createWorkflowEngineFixture({
      stateStore: store,
      projector,
      idempotency,
      clock,
      observability: createNoopObservability(),
      adapters: makeProviderMap(adapter),
      planFetcher,
    });

    const baseCtx: RunContext = {
      tenantId: 't1',
      projectId: 'p1',
      environmentId: 'dev',
      runId: 'run-x',
      targetAdapter: 'temporal',
    };

    // Case 1: URI not allowlisted
    const badPlanRef1: PlanRef = {
      uri: 'file:///etc/passwd',
      sha256: '0'.repeat(64),
      schemaVersion: '1.0',
      planId: 'p',
      planVersion: '1',
    };
    await expect(engine.startRun(badPlanRef1, baseCtx)).rejects.toThrow(PlanUriNotAllowedError);
    expect(startRunMock).not.toHaveBeenCalled();
    expect(planFetcher.fetchStoredPlanArtifact).not.toHaveBeenCalled();

    // Case 2: invalid schemaVersion
    const badPlanRef2: PlanRef = {
      uri: 'https://plans.example.com/plan.json',
      sha256: '0'.repeat(64),
      schemaVersion: '2.0', // invalid
      planId: 'p',
      planVersion: '1.0',
    };
    await expect(engine.startRun(badPlanRef2, baseCtx)).rejects.toMatchObject({
      messageKey: ENGINE_ERROR_MESSAGE_KEY.PLAN_SCHEMA_VERSION_UNKNOWN,
      message: ENGINE_ERROR_MESSAGE_KEY.PLAN_SCHEMA_VERSION_UNKNOWN,
    });
    expect(startRunMock).not.toHaveBeenCalled();
    expect(planFetcher.fetchStoredPlanArtifact).not.toHaveBeenCalled();

    // Engine entry-point integrity now owns fetch/verify, but invalid plan refs still fail before fetch.
  });
});
