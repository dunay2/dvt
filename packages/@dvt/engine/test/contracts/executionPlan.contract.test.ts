/**
 * @file packages/@dvt/engine/test/contracts/executionPlan.contract.test.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @baseline PR-2: Contract hardening for Planner → Engine
 *
 * Contract tests for ExecutionPlan metadata formalization.
 *
 * Scope:
 *   - Shape of ExecutionPlan: required vs optional fields compile and satisfy the TypeScript interface.
 *   - contractVersion validation: the in-memory temporal test double rejects plans with unknown versions.
 *   - Provenance fields: plannerVersion and plannerGitSha are optional and structurally inert.
 *   - Runtime policy fields are not carried inside canonical plan metadata.
 */
import type { ExecutionPlan, PlanRef } from '@dvt/contracts';
import { jcsCanonicalize } from '@dvt/crypto';
import { createNoopObservability } from '@dvt/observability';
import { describe, expect, it } from 'vitest';

import { InMemoryProviderAdapter } from '../../src/adapters/inMemory/InMemoryProviderAdapter.js';
import { SnapshotProjector } from '../../src/core/SnapshotProjector.js';
import { InMemoryTxStore } from '../../src/state/InMemoryTxStore.js';
import { SequenceClock } from '../../src/utils/clock.js';
import { sha256Hex, sha256HexUtf8 } from '../../src/utils/sha256.js';
import {
  createWorkflowEngineFixture,
  makePlanFetcherForPlan,
  makeProviderMap,
} from '../helpers/workflowEngine.fixture.js';

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
  targetAdapter: 'temporal';
} {
  return {
    tenantId: 't1',
    projectId: 'p1',
    environmentId: 'dev',
    runId,
    targetAdapter: 'temporal' as const,
  };
}

function createEngine(plan: ExecutionPlan): {
  engine: ReturnType<typeof createWorkflowEngineFixture>['engine'];
  planRef: PlanRef;
} {
  const uri = `https://plans.example.com/${plan.metadata.planId}.json`;
  const planRef = makePlanRef(uri, plan);
  const store = new InMemoryTxStore();
  const projector = new SnapshotProjector();
  const clock = new SequenceClock('2026-02-12T00:00:00.000Z');

  const adapter = new InMemoryProviderAdapter({
    stateStore: store,
    stateStoreWrite: store,
    clock,
    projector,
  });

  const { engine } = createWorkflowEngineFixture({
    stateStore: store,
    projector,
    observability: createNoopObservability(),
    adapters: makeProviderMap(adapter),
    planFetcher: makePlanFetcherForPlan(plan),
  });

  return { engine, planRef };
}

function makeMinimalPlan(): ExecutionPlan {
  const inputHashSha256 = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  const steps: ExecutionPlan['steps'] = [];
  return {
    metadata: {
      planId: sha256HexUtf8(
        jcsCanonicalize({
          metadata: {
            planVersion: '1.0',
            inputHashSha256,
          },
          steps,
        })
      ),
      planVersion: '1.0',
      schemaVersion: '1.0',
      contractVersion: '1.0.0',
      inputHashSha256,
      createdAtIso: '2026-02-23T00:00:00.000Z',
    },
    steps,
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

  it('createdAtIso is required on canonical metadata', (): void => {
    const plan: ExecutionPlan = {
      ...makeMinimalPlan(),
      metadata: {
        ...makeMinimalPlan().metadata,
      },
    };
    expect(plan.metadata.createdAtIso).toBe('2026-02-23T00:00:00.000Z');
  });

  it('does not carry runtime policy fields in metadata', (): void => {
    const metadata = makeMinimalPlan().metadata as Record<string, unknown>;
    expect(metadata).not.toHaveProperty('requiresCapabilities');
    expect(metadata).not.toHaveProperty('targetAdapter');
    expect(metadata).not.toHaveProperty('fallbackBehavior');
  });

  it('steps array uses the governed shared shape', (): void => {
    const plan: ExecutionPlan = {
      ...makeMinimalPlan(),
      steps: [{ stepId: 's1', kind: 'noop', dependsOn: [] }],
    };
    expect(plan.steps[0]).toHaveProperty('stepId', 's1');
  });
});

// ─── contractVersion validation (via in-memory temporal provider adapter) ─────

describe('ExecutionPlan — contractVersion validation', (): void => {
  it('accepts a plan with contractVersion "1.0.0"', async (): Promise<void> => {
    const plan = makeMinimalPlan();
    const { engine, planRef } = createEngine(plan);
    await expect(engine.startRun(planRef, makeCtx('cv-ok-1'))).resolves.toMatchObject({
      provider: 'temporal',
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
      'INVALID_EXECUTABLE_PLAN'
    );
  });
});

// ─── Provenance fields are stored alongside planId ────────────────────────────

describe('ExecutionPlan — provenance metadata is inert at runtime', (): void => {
  it('plan with all provenance fields executes without error', async (): Promise<void> => {
    const plan: ExecutionPlan = {
      metadata: {
        planId: sha256HexUtf8(
          jcsCanonicalize({
            metadata: {
              planVersion: '1.0',
              inputHashSha256: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
            },
            steps: [{ stepId: 's1', kind: 'noop', dependsOn: [] }],
          })
        ),
        planVersion: '1.0',
        schemaVersion: '1.0',
        contractVersion: '1.0.0',
        inputHashSha256: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        createdAtIso: '2026-02-23T00:00:00.000Z',
        plannerVersion: '3.1.4',
        plannerGitSha: 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
      },
      steps: [{ stepId: 's1', kind: 'noop', dependsOn: [] }],
    };
    const { engine, planRef } = createEngine(plan);
    await expect(engine.startRun(planRef, makeCtx('prov-1'))).resolves.toMatchObject({
      provider: 'temporal',
      runId: 'prov-1',
    });
  });
});
