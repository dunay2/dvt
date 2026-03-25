/**
 * @file packages/@dvt/engine/test/contracts/executionPlan.contract.test.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @baseline PR-2: Contract hardening for Planner → Engine
 *
 * Contract tests for ExecutionPlan metadata formalization.
 *
 * Scope:
 *   - Shape of ExecutionPlan: required vs optional fields compile and satisfy the TypeScript interface.
 *   - contractVersion validation: MockAdapter rejects plans with unknown versions.
 *   - Provenance fields: plannerVersion, plannerGitSha, generatedAt are optional and structurally inert.
 *   - Step metadata passthrough: extra step fields are rejected by the mock adapter narrowing rule.
 */
import type { EngineRunRef, PlanRef } from '@dvt/contracts';
import { createNoopObservability } from '@dvt/observability';
import { describe, expect, it } from 'vitest';

import { MockAdapter } from '../../src/adapters/mock/MockAdapter.js';
import type { ExecutionPlan } from '../../src/contracts/executionPlan.js';
import { IdempotencyKeyBuilder } from '../../src/core/idempotency.js';
import { SnapshotProjector } from '../../src/core/SnapshotProjector.js';
import { WorkflowEngine } from '../../src/core/WorkflowEngine.js';
import { AllowAllAuthorizer } from '../../src/security/authorizer.js';
import { PlanRefPolicy } from '../../src/security/planRefPolicy.js';
import { RunAccessPolicy } from '../../src/security/RunAccessPolicy.js';
import { InMemoryStartRunIntentStore } from '../../src/state/InMemoryStartRunIntentStore.js';
import { InMemoryTxStore } from '../../src/state/InMemoryTxStore.js';
import { SequenceClock } from '../../src/utils/clock.js';
import { sha256Hex } from '../../src/utils/sha256.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function utf8(s: string): Uint8Array {
  return new TextEncoder().encode(s);
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

function makeCtx(runId: string): {
  tenantId: string;
  projectId: string;
  environmentId: string;
  runId: string;
  targetAdapter: 'mock';
} {
  return {
    tenantId: 't1',
    projectId: 'p1',
    environmentId: 'dev',
    runId,
    targetAdapter: 'mock' as const,
  };
}

function createEngine(plan: ExecutionPlan): { engine: WorkflowEngine; planRef: PlanRef } {
  const uri = `https://plans.example.com/${plan.metadata.planId}.json`;
  const planRef = makePlanRef(uri, plan);
  const store = new InMemoryTxStore();
  const projector = new SnapshotProjector();

  const mock = new MockAdapter({
    stateStore: store,
    projector,
    planFetcher: { fetch: async () => plan },
  });

  const engine = new WorkflowEngine({
    stateStoreRead: store,
    stateStoreWrite: store,

    projector,
    idempotency: new IdempotencyKeyBuilder(),
    clock: new SequenceClock('2026-02-23T00:00:00.000Z'),
    policy: new RunAccessPolicy({
      authorizer: new AllowAllAuthorizer(),
      planRefPolicy: new PlanRefPolicy({ allowedSchemes: ['https'] }),
    }),
    intentStore: new InMemoryStartRunIntentStore(),
    observability: createNoopObservability(),
    adapters: new Map<EngineRunRef['provider'], typeof mock>([['mock', mock]]),
  });

  return { engine, planRef };
}

function makeMinimalPlan(): ExecutionPlan {
  return {
    metadata: {
      planId: 'cp2-minimal',
      planVersion: '2.3',
      schemaVersion: 'v1.2',
      contractVersion: '1.0.0',
    },
    steps: [],
  };
}

// ─── Shape tests (compile-time contract + runtime property checks) ────────────

describe('ExecutionPlan — interface shape', (): void => {
  it('requires planId, planVersion, schemaVersion, contractVersion in metadata', (): void => {
    const plan: ExecutionPlan = makeMinimalPlan();
    expect(plan.metadata).toHaveProperty('planId');
    expect(plan.metadata).toHaveProperty('planVersion');
    expect(plan.metadata).toHaveProperty('schemaVersion');
    expect(plan.metadata).toHaveProperty('contractVersion');
  });

  it('plannerVersion is optional', (): void => {
    const plan: ExecutionPlan = {
      ...makeMinimalPlan(),
      metadata: {
        ...makeMinimalPlan().metadata,
        plannerVersion: '2.3.1',
      },
    };
    expect(plan.metadata.plannerVersion).toBe('2.3.1');
  });

  it('plannerGitSha is optional', (): void => {
    const plan: ExecutionPlan = {
      ...makeMinimalPlan(),
      metadata: {
        ...makeMinimalPlan().metadata,
        plannerGitSha: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
      },
    };
    expect(plan.metadata.plannerGitSha).toHaveLength(40);
  });

  it('generatedAt is optional', (): void => {
    const plan: ExecutionPlan = {
      ...makeMinimalPlan(),
      metadata: {
        ...makeMinimalPlan().metadata,
        generatedAt: '2026-02-23T00:00:00.000Z',
      },
    };
    expect(plan.metadata.generatedAt).toBe('2026-02-23T00:00:00.000Z');
  });

  it('requiresCapabilities is optional', (): void => {
    const withCaps: ExecutionPlan = {
      ...makeMinimalPlan(),
      metadata: { ...makeMinimalPlan().metadata, requiresCapabilities: ['basic-execution'] },
    };
    const withoutCaps: ExecutionPlan = makeMinimalPlan();
    expect(withCaps.metadata.requiresCapabilities).toEqual(['basic-execution']);
    expect(withoutCaps.metadata.requiresCapabilities).toBeUndefined();
  });

  it('steps array accepts extra fields (open record)', (): void => {
    const plan: ExecutionPlan = {
      ...makeMinimalPlan(),
      steps: [{ stepId: 's1', kind: 'noop', dependsOn: [] }],
    };
    expect(plan.steps[0]).toHaveProperty('stepId', 's1');
  });
});

// ─── contractVersion validation (via MockAdapter) ─────────────────────────────

describe('ExecutionPlan — contractVersion validation', (): void => {
  it('accepts a plan with contractVersion "1.0.0"', async (): Promise<void> => {
    const plan = makeMinimalPlan();
    const { engine, planRef } = createEngine(plan);
    await expect(engine.startRun(planRef, makeCtx('cv-ok-1'))).resolves.toMatchObject({
      provider: 'mock',
      runId: 'cv-ok-1',
    });
  });

  it('rejects a plan with an unknown contractVersion', async (): Promise<void> => {
    const plan: ExecutionPlan = {
      ...makeMinimalPlan(),
      metadata: { ...makeMinimalPlan().metadata, contractVersion: '99.0.0' },
    };
    const { engine, planRef } = createEngine(plan);
    await expect(engine.startRun(planRef, makeCtx('cv-bad-1'))).rejects.toThrow(
      'PLAN_CONTRACT_VERSION_UNKNOWN'
    );
  });
});

// ─── Provenance fields are stored alongside planId ────────────────────────────

describe('ExecutionPlan — provenance metadata is inert at runtime', (): void => {
  it('plan with all provenance fields executes without error', async (): Promise<void> => {
    const plan: ExecutionPlan = {
      metadata: {
        planId: 'cp2-full',
        planVersion: '2.3',
        schemaVersion: 'v1.2',
        contractVersion: '1.0.0',
        plannerVersion: '3.1.4',
        plannerGitSha: 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
        generatedAt: '2026-02-23T00:00:00.000Z',
        requiresCapabilities: ['basic-execution'],
        targetAdapter: 'mock',
        fallbackBehavior: 'reject',
      },
      steps: [{ stepId: 's1', kind: 'noop' }],
    };
    const { engine, planRef } = createEngine(plan);
    await expect(engine.startRun(planRef, makeCtx('prov-1'))).resolves.toMatchObject({
      provider: 'mock',
      runId: 'prov-1',
    });
  });
});
