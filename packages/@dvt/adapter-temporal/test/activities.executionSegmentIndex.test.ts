/**
 * @ownedConcern Verified-plan index reuse at the Temporal activity boundary.
 * @baseline ADR-0052: PlanRef Continuation Safety
 * @decision Count real graph preparations while retaining real integrity and scope checks on every request.
 * @consequence Reuse cannot admit stale, unavailable, expired or cross-scope plan material.
 */
import type { IStoredPlanArtifactReader } from '@dvt/artifacts';
import {
  asIsoUtcString,
  type ExecutionPlan,
  type PlanRef,
  type ResolvedRunContext,
  type ScopedPlanRef,
} from '@dvt/contracts';
import { sha256Hex } from '@dvt/crypto';
import { PlanIntegrityValidator } from '@dvt/engine/runtime';
import { planExecutionLayers } from '@dvt/plan-interpreter';
import { beforeEach, describe, expect, it, vi, type Mock, type MockInstance } from 'vitest';

import { createActivities } from '../src/activities/activityFactory.js';
import {
  createScopedTemporalPlanArtifactReader,
  type TemporalPlanArtifactReader,
} from '../src/activities/temporalPlanArtifactReader.js';
import type { ResolvedExecutionSegment } from '../src/workflows/executionSegmentResolver.js';

import {
  createExecutionPlan,
  createPlanRef,
  createResolvedRunContext,
} from './helpers/contractFixtures.js';

vi.mock('@dvt/plan-interpreter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@dvt/plan-interpreter')>();
  return { ...actual, planExecutionLayers: vi.fn(actual.planExecutionLayers) };
});

const OWNERSHIP = { tenantId: 'tenant-a', projectId: 'project-a', environmentId: 'env-a' };
const CTX = createResolvedRunContext({ ...OWNERSHIP, runId: 'run-a' });
const NOW = asIsoUtcString('2026-10-22T10:00:00.000Z');
const PLAN = createExecutionPlan({
  ownership: OWNERSHIP,
  steps: [
    { stepId: 'source', kind: 'NOOP', dependsOn: [] },
    {
      stepId: 'gate',
      kind: 'GATEWAY',
      type: 'gateway',
      dependsOn: ['source'],
      gateway: { dslVersion: '1.0', expression: "status='COMPLETED'" },
    },
    { stepId: 'sink', kind: 'NOOP', dependsOn: ['gate'] },
  ],
});

interface TestArtifact {
  plan: ExecutionPlan;
  bytes: Buffer;
  ref: PlanRef;
}

interface SegmentHarness {
  create(): ReturnType<typeof createActivities>;
  bytesByUri: Map<PlanRef['uri'], Buffer>;
  fetchStoredPlanArtifact: Mock<IStoredPlanArtifactReader['fetchStoredPlanArtifact']>;
  fetchForEngineDispatch: MockInstance<TemporalPlanArtifactReader['fetchForEngineDispatch']>;
  setNow(value: string): void;
  resolve(
    planRef: PlanRef,
    layerIndex: number,
    ctx?: ResolvedRunContext
  ): Promise<ResolvedExecutionSegment>;
}

function artifact(plan: ExecutionPlan = PLAN, uri = 'memory://plans/a'): TestArtifact {
  const bytes = Buffer.from(JSON.stringify(plan), 'utf8');
  return {
    plan,
    bytes,
    ref: createPlanRef({ uri, sha256: sha256Hex(bytes), planId: plan.metadata.planId }),
  };
}

function unexpectedSideEffect(): never {
  throw new Error('Segment resolution must not execute steps or publish events');
}

function harness(artifacts: readonly TestArtifact[] = [artifact()]): SegmentHarness {
  const bytesByUri = new Map(artifacts.map((entry) => [entry.ref.uri, entry.bytes]));
  let now = NOW;
  const clock = { nowIsoUtc: () => now };
  const fetchStoredPlanArtifact = vi.fn<IStoredPlanArtifactReader['fetchStoredPlanArtifact']>(
    async (input: ScopedPlanRef) => {
      const bytes = bytesByUri.get(input.planRef.uri);
      if (bytes === undefined) throw new Error('PLAN_REF_UNAVAILABLE');
      return { bytes, executionPolicy: {} };
    }
  );
  const fetcher: IStoredPlanArtifactReader = {
    fetchStoredPlanArtifact,
    getStoredPlanValidationRecord: async () => undefined,
    fetchStoredPlanArtifactForValidation: async () => unexpectedSideEffect(),
  };
  const reader = createScopedTemporalPlanArtifactReader({
    fetcher,
    integrity: new PlanIntegrityValidator({ clock }),
  });
  const fetchForEngineDispatch = vi.spyOn(reader, 'fetchForEngineDispatch');
  const create = (): ReturnType<typeof createActivities> =>
    createActivities({
      planArtifactReader: reader,
      clock,
      runStateCommandPort: {
        bootstrapRun: async () => unexpectedSideEffect(),
        appendTransitions: async () => unexpectedSideEffect(),
      },
      idempotency: {
        eventId: unexpectedSideEffect,
        runEventKey: unexpectedSideEffect,
        startRunIntentId: unexpectedSideEffect,
      },
    });
  const activities = create();
  return {
    create,
    bytesByUri,
    fetchStoredPlanArtifact,
    fetchForEngineDispatch,
    setNow(value: string) {
      now = asIsoUtcString(value);
    },
    resolve(planRef: PlanRef, layerIndex: number, ctx = CTX) {
      return activities.resolveExecutionSegment({ planRef, layerIndex, ctx });
    },
  };
}

describe('activity execution segment index reuse', () => {
  beforeEach(() => {
    vi.mocked(planExecutionLayers).mockClear();
  });

  it('prepares one index for all resident segments and verifies every request', async () => {
    const entry = artifact(
      createExecutionPlan({
        ownership: OWNERSHIP,
        steps: Array.from({ length: 24 }, (_, index) => ({
          stepId: `step-${index}`,
          kind: 'NOOP',
          dependsOn: index === 0 ? [] : [`step-${index - 1}`],
          stepTypeConfig: { concurrency: { maxInFlight: 2 } },
        })),
      })
    );
    const h = harness([entry]);
    for (let index = 0; index < 24; index += 1) {
      const segment = await h.resolve(entry.ref, index);
      expect(segment).toMatchObject({
        layerIndex: index,
        totalLayerCount: 24,
        completedStepCountBeforeLayer: index,
        maxInFlight: 2,
        steps: [{ stepId: `step-${index}` }],
      });
    }
    expect(h.fetchForEngineDispatch).toHaveBeenCalledTimes(24);
    expect(h.fetchStoredPlanArtifact).toHaveBeenCalledTimes(24);
    expect(planExecutionLayers).toHaveBeenCalledTimes(1);
  });

  it('preserves gateway projection and returns fresh verified steps and metadata arrays', async () => {
    const entry = artifact();
    const h = harness([entry]);
    const source = await h.resolve(entry.ref, 0);
    expect(source.retainedGatewayDependencyStepIds).toEqual(['source']);
    source.retainedGatewayDependencyStepIds.push('poison');
    source.steps[0]!.dependsOn!.push('poison');
    const first = await h.resolve(entry.ref, 1);
    expect(first.downstreamStepIdsByGatewayStepId).toEqual({ gate: ['sink'] });
    first.steps[0]!.dependsOn!.push('poison');
    first.downstreamStepIdsByGatewayStepId['gate']!.push('poison');
    first.steps.push({ stepId: 'poison', kind: 'NOOP' });
    const second = await h.resolve(entry.ref, 1);
    const latestRead = await h.fetchForEngineDispatch.mock.results[2]!.value;
    expect(second.steps[0]).toBe(latestRead.plan.steps[1]);
    expect(second.steps).toHaveLength(1);
    expect(second.steps[0]?.dependsOn).toEqual(['source']);
    expect(second.downstreamStepIdsByGatewayStepId).toEqual({ gate: ['sink'] });
    expect(second.retainedGatewayDependencyStepIds).toEqual([]);
    expect(second.completedStepCountBeforeLayer).toBe(1);
    expect((await h.resolve(entry.ref, 0)).retainedGatewayDependencyStepIds).toEqual(['source']);
    expect(planExecutionLayers).toHaveBeenCalledTimes(1);
  });

  it('keys by verified digest rather than planId and evicts the previous index', async () => {
    const first = artifact();
    const second = artifact(
      {
        ...PLAN,
        observability: {
          extra: { transformationFlowRuntime: { previewProfile: 'default', executor: 'dbt' } },
        },
      },
      'memory://plans/b'
    );
    expect(second.ref.planId).toBe(first.ref.planId);
    expect(second.ref.sha256).not.toBe(first.ref.sha256);
    const h = harness([first, second]);
    await h.resolve(first.ref, 0);
    await h.resolve(first.ref, 1);
    expect((await h.resolve(second.ref, 0)).runtimeExecutor).toBe('dbt');
    await h.resolve(second.ref, 1);
    expect((await h.resolve(first.ref, 2)).runtimeExecutor).toBeUndefined();
    expect(planExecutionLayers).toHaveBeenCalledTimes(3);
    expect(h.fetchStoredPlanArtifact).toHaveBeenCalledTimes(5);
  });

  it('keeps index residency local to each activity factory', async () => {
    const entry = artifact();
    const h = harness([entry]);
    await h.resolve(entry.ref, 0);
    const independent = h.create();
    await independent.resolveExecutionSegment({ planRef: entry.ref, layerIndex: 1, ctx: CTX });
    await h.resolve(entry.ref, 2);
    expect(planExecutionLayers).toHaveBeenCalledTimes(2);
    expect(h.fetchStoredPlanArtifact).toHaveBeenCalledTimes(3);
  });

  it('rejects modified bytes after an index has been prepared', async () => {
    const entry = artifact();
    const h = harness([entry]);
    await h.resolve(entry.ref, 0);
    h.bytesByUri.set(entry.ref.uri, Buffer.from('{}'));
    await expect(h.resolve(entry.ref, 1)).rejects.toThrow('PLAN_INTEGRITY_VALIDATION_FAILED');
    expect(h.fetchStoredPlanArtifact).toHaveBeenCalledTimes(2);
    expect(planExecutionLayers).toHaveBeenCalledTimes(1);
  });

  it('rejects an unavailable artifact after an index has been prepared', async () => {
    const entry = artifact();
    const h = harness([entry]);
    await h.resolve(entry.ref, 0);
    h.bytesByUri.delete(entry.ref.uri);
    await expect(h.resolve(entry.ref, 1)).rejects.toThrow('PLAN_REF_UNAVAILABLE');
    expect(h.fetchStoredPlanArtifact).toHaveBeenCalledTimes(2);
    expect(planExecutionLayers).toHaveBeenCalledTimes(1);
  });

  it('rejects expiry before fetching bytes even when the index is resident', async () => {
    const entry = artifact();
    const ref = { ...entry.ref, expiresAt: asIsoUtcString('2026-10-22T10:00:01.000Z') };
    const h = harness([entry]);
    await h.resolve(ref, 0);
    h.setNow(ref.expiresAt);
    await expect(h.resolve(ref, 1)).rejects.toThrow('PLAN_REF_EXPIRED');
    expect(h.fetchForEngineDispatch).toHaveBeenCalledTimes(2);
    expect(h.fetchStoredPlanArtifact).toHaveBeenCalledTimes(1);
    expect(planExecutionLayers).toHaveBeenCalledTimes(1);
  });

  it.each(['tenantId', 'projectId', 'environmentId'] as const)(
    'rejects a changed %s after an index has been prepared',
    async (field) => {
      const entry = artifact();
      const h = harness([entry]);
      await h.resolve(entry.ref, 0);
      const otherScope = createResolvedRunContext({
        ...OWNERSHIP,
        [field]: 'other',
        runId: 'run-b',
      });
      await expect(h.resolve(entry.ref, 1, otherScope)).rejects.toThrow('PLAN_SCOPE_MISMATCH');
      expect(h.fetchStoredPlanArtifact).toHaveBeenCalledTimes(2);
      expect(planExecutionLayers).toHaveBeenCalledTimes(1);
    }
  );

  it('retains empty-plan and out-of-range behavior on resident indexes', async () => {
    const entry = artifact(createExecutionPlan({ ownership: OWNERSHIP, steps: [] }));
    const h = harness([entry]);
    expect(await h.resolve(entry.ref, 0)).toEqual({
      layerIndex: 0,
      totalLayerCount: 0,
      runtimeExecutor: undefined,
      steps: [],
      downstreamStepIdsByGatewayStepId: {},
      retainedGatewayDependencyStepIds: [],
      completedStepCountBeforeLayer: 0,
    });
    await expect(h.resolve(entry.ref, 1)).rejects.toThrow('nextLayerIndex_out_of_range');
    await expect(h.resolve(entry.ref, -1)).rejects.toThrow('nextLayerIndex_out_of_range');
    expect(planExecutionLayers).toHaveBeenCalledTimes(1);
  });
});
