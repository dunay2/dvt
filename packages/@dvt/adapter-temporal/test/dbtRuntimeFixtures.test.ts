import type { ScopedPlanRef } from '@dvt/contracts';
import { jcsCanonicalize, sha256HexUtf8 } from '@dvt/crypto';
import { describe, expect, it } from 'vitest';

import { createExecutionPlan } from './helpers/contractFixtures.js';
import {
  createDbtActivityDeps,
  createDbtRunExecutionContext,
  createDbtRunExecutionContextRef,
  resolveDbtPluginContext,
  withDbtRunExecutionContext,
} from './helpers/integration/dbtRuntimeFixtures.js';
import { TestOutbox, RunId, TestStateStore } from './helpers/integration/runtimeState.js';
import { createPlanRef, createRunContext } from './helpers/integration/testPlans.js';

const DEFAULT_PLAN_STEPS: Parameters<typeof createExecutionPlan>[0]['steps'] = [
  {
    stepId: 's-1',
    kind: 'DBT_MODEL',
    dependsOn: [],
  },
];

function createPlanBytes(
  planId: string,
  steps: Parameters<typeof createExecutionPlan>[0]['steps'] = DEFAULT_PLAN_STEPS
): Buffer {
  return Buffer.from(
    JSON.stringify(
      createExecutionPlan({
        inputHashSha256: sha256HexUtf8(jcsCanonicalize({ planId })),
        createdAtIso: '2026-04-20T00:00:00.000Z',
        steps,
      })
    ),
    'utf-8'
  );
}

function scopedPlanRef(
  ctx: ReturnType<typeof createRunContext>,
  planRef: Parameters<typeof createDbtRunExecutionContext>[1]
): ScopedPlanRef {
  return {
    tenantId: ctx.tenantId,
    projectId: ctx.projectId,
    environmentId: ctx.environmentId,
    planRef,
  };
}

describe('dbtRuntimeFixtures', () => {
  it('creates run-scoped refs bound to the canonical run execution context bytes', () => {
    const planBytes = createPlanBytes('it-plan');
    const planRef = createPlanRef('it-plan', planBytes);
    const firstContext = createRunContext(RunId.of('run-1'));
    const secondContext = createRunContext(RunId.of('run-2'));

    const firstRunExecutionContext = createDbtRunExecutionContext(firstContext, planRef);
    const secondRunExecutionContext = createDbtRunExecutionContext(secondContext, planRef);
    const firstRef = createDbtRunExecutionContextRef(firstContext, planRef);
    const secondRef = createDbtRunExecutionContextRef(secondContext, planRef);

    expect(firstRef.uri).toContain('/run-1/');
    expect(secondRef.uri).toContain('/run-2/');
    expect(firstRef).not.toEqual(secondRef);
    expect(firstRef.sha256).toBe(sha256HexUtf8(jcsCanonicalize(firstRunExecutionContext)));
    expect(secondRef.sha256).toBe(sha256HexUtf8(jcsCanonicalize(secondRunExecutionContext)));
  });

  it('keeps the runExecutionContextRef hash stable when object property order changes', () => {
    const planBytes = createPlanBytes('it-plan');
    const planRef = createPlanRef('it-plan', planBytes);
    const firstContext = createRunContext(RunId.of('run-1'));
    const runExecutionContext = createDbtRunExecutionContext(firstContext, planRef);
    const reorderedRunExecutionContext = {
      createdBy: runExecutionContext.createdBy,
      targetAdapter: runExecutionContext.targetAdapter,
      projectId: runExecutionContext.projectId,
      pluginContexts: {
        dbt: {
          targetProfile: runExecutionContext.pluginContexts.dbt?.targetProfile,
          credentialRef: runExecutionContext.pluginContexts.dbt?.credentialRef,
          projectBundleRef: runExecutionContext.pluginContexts.dbt?.projectBundleRef,
        },
      },
      schemaVersion: runExecutionContext.schemaVersion,
      environmentId: runExecutionContext.environmentId,
      tenantId: runExecutionContext.tenantId,
      planSha256: runExecutionContext.planSha256,
      planVersion: runExecutionContext.planVersion,
      createdAtIso: runExecutionContext.createdAtIso,
      planId: runExecutionContext.planId,
    };

    const ref = createDbtRunExecutionContextRef(firstContext, planRef);

    expect(ref.sha256).toBe(sha256HexUtf8(jcsCanonicalize(reorderedRunExecutionContext)));
  });

  it('resolves only the registered run execution context for each run ref', async () => {
    const planBytes = createPlanBytes('it-plan');
    const planRef = createPlanRef('it-plan', planBytes);
    const firstContext = withDbtRunExecutionContext(createRunContext(RunId.of('run-1')), planRef);
    const secondContext = withDbtRunExecutionContext(createRunContext(RunId.of('run-2')), planRef);

    const deps = createDbtActivityDeps({
      store: new TestStateStore(),
      outbox: new TestOutbox(),
      bindings: [
        { ctx: firstContext, planRef, planBytes },
        { ctx: secondContext, planRef, planBytes },
      ],
    });

    const reader = deps.runExecutionContextReader;
    if (reader === undefined) {
      throw new Error('EXPECTED_RUN_EXECUTION_CONTEXT_READER');
    }

    const firstResolved = await reader.resolve(firstContext.runExecutionContextRef!);
    const secondResolved = await reader.resolve(secondContext.runExecutionContextRef!);
    const unregisteredContext = withDbtRunExecutionContext(
      createRunContext(RunId.of('run-3')),
      planRef
    );

    expect(resolveDbtPluginContext(firstResolved).projectBundleRef.uri).toMatch(
      /^s3:\/\/bundle-bucket\/tenants\/t-it\/[a-f0-9]{64}$/
    );
    expect(resolveDbtPluginContext(secondResolved).projectBundleRef.uri).toMatch(
      /^s3:\/\/bundle-bucket\/tenants\/t-it\/[a-f0-9]{64}$/
    );
    await expect(reader.resolve(unregisteredContext.runExecutionContextRef!)).rejects.toThrow(
      'RUN_EXECUTION_CONTEXT_NOT_REGISTERED'
    );
  });

  it('fetches registered plan bytes by PlanRef instead of reusing one worker-global blob', async () => {
    const firstPlanBytes = createPlanBytes('it-plan-a');
    const secondPlanBytes = createPlanBytes('it-plan-b', [
      {
        stepId: 's-1',
        kind: 'DBT_MODEL',
        dependsOn: [],
      },
    ]);
    const firstPlanRef = createPlanRef('it-plan-a', firstPlanBytes);
    const secondPlanRef = createPlanRef('it-plan-b', secondPlanBytes);
    const firstContext = withDbtRunExecutionContext(
      createRunContext(RunId.of('run-1')),
      firstPlanRef
    );
    const secondContext = withDbtRunExecutionContext(
      createRunContext(RunId.of('run-2')),
      secondPlanRef
    );

    const deps = createDbtActivityDeps({
      store: new TestStateStore(),
      outbox: new TestOutbox(),
      bindings: [
        { ctx: firstContext, planRef: firstPlanRef, planBytes: firstPlanBytes },
        { ctx: secondContext, planRef: secondPlanRef, planBytes: secondPlanBytes },
      ],
    });

    const firstFetched = await deps.integrity.fetchAndValidate(
      scopedPlanRef(firstContext, firstPlanRef),
      deps.fetcher
    );
    const secondFetched = await deps.integrity.fetchAndValidate(
      scopedPlanRef(secondContext, secondPlanRef),
      deps.fetcher
    );

    expect(firstFetched.plan.metadata.planId).toBe(firstPlanRef.planId);
    expect(firstFetched.executionPolicy).toEqual({});
    expect(secondFetched.plan.metadata.planId).toBe(secondPlanRef.planId);
    expect(secondFetched.plan.steps).toHaveLength(1);
    expect(secondFetched.executionPolicy).toEqual({});
    await expect(
      deps.integrity.fetchAndValidate(
        scopedPlanRef(firstContext, createPlanRef('it-plan-c', createPlanBytes('it-plan-c'))),
        deps.fetcher
      )
    ).rejects.toThrow('PLAN_BYTES_NOT_REGISTERED');
  });

  it('resolves registered plan bytes even when the requested PlanRef omits optional sizeBytes metadata', async () => {
    const planBytes = createPlanBytes('it-plan-a');
    const registeredPlanRef = createPlanRef('it-plan-a', planBytes);
    const requestedPlanRef = {
      uri: registeredPlanRef.uri,
      sha256: registeredPlanRef.sha256,
      schemaVersion: registeredPlanRef.schemaVersion,
      planId: registeredPlanRef.planId,
      planVersion: registeredPlanRef.planVersion,
    };
    const ctx = withDbtRunExecutionContext(createRunContext(RunId.of('run-1')), registeredPlanRef);

    const deps = createDbtActivityDeps({
      store: new TestStateStore(),
      outbox: new TestOutbox(),
      bindings: [{ ctx, planRef: registeredPlanRef, planBytes }],
    });

    const fetched = await deps.integrity.fetchAndValidate(
      scopedPlanRef(ctx, requestedPlanRef),
      deps.fetcher
    );

    expect(fetched.plan.metadata.planId).toBe(registeredPlanRef.planId);
    expect(fetched.executionPolicy).toEqual({});
  });

  it('rejects bindings that omit plan bytes instead of falling back to a shared blob', () => {
    const firstPlanBytes = createPlanBytes('it-plan-a');
    const secondPlanBytes = createPlanBytes('it-plan-b');
    const firstPlanRef = createPlanRef('it-plan-a', firstPlanBytes);
    const secondPlanRef = createPlanRef('it-plan-b', secondPlanBytes);
    const firstContext = withDbtRunExecutionContext(
      createRunContext(RunId.of('run-1')),
      firstPlanRef
    );
    const secondContext = withDbtRunExecutionContext(
      createRunContext(RunId.of('run-2')),
      secondPlanRef
    );

    expect(() =>
      createDbtActivityDeps({
        store: new TestStateStore(),
        outbox: new TestOutbox(),
        bindings: [
          { ctx: firstContext, planRef: firstPlanRef, planBytes: firstPlanBytes },
          { ctx: secondContext, planRef: secondPlanRef } as never,
        ],
      })
    ).toThrow('DBT_PLAN_BYTES_REQUIRED:1');
  });

  it('rejects bindings whose precomputed runExecutionContextRef no longer matches the registered plan', () => {
    const firstPlanBytes = createPlanBytes('it-plan-a');
    const secondPlanBytes = createPlanBytes('it-plan-b');
    const firstPlanRef = createPlanRef('it-plan-a', firstPlanBytes);
    const secondPlanRef = createPlanRef('it-plan-b', secondPlanBytes);
    const contextBoundToFirstPlan = withDbtRunExecutionContext(
      createRunContext(RunId.of('run-1')),
      firstPlanRef
    );

    expect(() =>
      createDbtActivityDeps({
        store: new TestStateStore(),
        outbox: new TestOutbox(),
        bindings: [
          { ctx: contextBoundToFirstPlan, planRef: secondPlanRef, planBytes: secondPlanBytes },
        ],
      })
    ).toThrow('RUN_EXECUTION_CONTEXT_PLAN_REF_MISMATCH');
  });
});
