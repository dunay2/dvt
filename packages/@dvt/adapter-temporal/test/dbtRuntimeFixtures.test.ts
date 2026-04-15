import { jcsCanonicalize, sha256Hex } from '@dvt/crypto';
import { describe, expect, it } from 'vitest';

import {
  createMultiRunDbtActivityDeps,
  createDbtRunExecutionContext,
  createDbtRunExecutionContextRef,
  withDbtRunExecutionContext,
} from './helpers/integration/dbtRuntimeFixtures.js';
import { TestOutbox, RunId, TestStateStore } from './helpers/integration/runtimeState.js';
import { createPlanRef, createRunContext } from './helpers/integration/testPlans.js';

describe('dbtRuntimeFixtures', () => {
  it('creates run-scoped refs bound to the canonical run execution context bytes', () => {
    const planBytes = Buffer.from(JSON.stringify({ metadata: { planId: 'it-plan' } }), 'utf-8');
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
    expect(firstRef.sha256).toBe(sha256Hex(jcsCanonicalize(firstRunExecutionContext)));
    expect(secondRef.sha256).toBe(sha256Hex(jcsCanonicalize(secondRunExecutionContext)));
  });

  it('keeps the runExecutionContextRef hash stable when object property order changes', () => {
    const planBytes = Buffer.from(JSON.stringify({ metadata: { planId: 'it-plan' } }), 'utf-8');
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

    expect(ref.sha256).toBe(sha256Hex(jcsCanonicalize(reorderedRunExecutionContext)));
  });

  it('resolves only the registered run execution context for each run ref', async () => {
    const planBytes = Buffer.from(JSON.stringify({ metadata: { planId: 'it-plan' } }), 'utf-8');
    const planRef = createPlanRef('it-plan', planBytes);
    const firstContext = withDbtRunExecutionContext(createRunContext(RunId.of('run-1')), planRef);
    const secondContext = withDbtRunExecutionContext(createRunContext(RunId.of('run-2')), planRef);

    const deps = createMultiRunDbtActivityDeps(new TestStateStore(), new TestOutbox(), [
      { ctx: firstContext, planRef, planBytes },
      { ctx: secondContext, planRef, planBytes },
    ]);

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

    expect(firstResolved.pluginContexts.dbt?.projectBundleRef.uri).toMatch(
      /^s3:\/\/bundle-bucket\/tenants\/t-it\/[a-f0-9]{64}$/
    );
    expect(secondResolved.pluginContexts.dbt?.projectBundleRef.uri).toMatch(
      /^s3:\/\/bundle-bucket\/tenants\/t-it\/[a-f0-9]{64}$/
    );
    await expect(reader.resolve(unregisteredContext.runExecutionContextRef!)).rejects.toThrow(
      'RUN_EXECUTION_CONTEXT_NOT_REGISTERED'
    );
  });

  it('fetches registered plan bytes by PlanRef instead of reusing one worker-global blob', async () => {
    const firstPlanBytes = Buffer.from(
      JSON.stringify({ metadata: { planId: 'it-plan-a' } }),
      'utf-8'
    );
    const secondPlanBytes = Buffer.from(
      JSON.stringify({
        metadata: { planId: 'it-plan-b' },
        steps: [{ stepId: 's-1', kind: 'DBT_MODEL' }],
      }),
      'utf-8'
    );
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

    const deps = createMultiRunDbtActivityDeps(new TestStateStore(), new TestOutbox(), [
      { ctx: firstContext, planRef: firstPlanRef, planBytes: firstPlanBytes },
      { ctx: secondContext, planRef: secondPlanRef, planBytes: secondPlanBytes },
    ]);

    const firstFetched = await deps.integrity.fetchAndValidate(firstPlanRef, deps.fetcher);
    const secondFetched = await deps.integrity.fetchAndValidate(secondPlanRef, deps.fetcher);

    expect(Buffer.from(firstFetched).toString('utf-8')).toBe(
      Buffer.from(firstPlanBytes).toString('utf-8')
    );
    expect(Buffer.from(secondFetched).toString('utf-8')).toBe(
      Buffer.from(secondPlanBytes).toString('utf-8')
    );
    await expect(
      deps.integrity.fetchAndValidate(
        createPlanRef(
          'it-plan-c',
          Buffer.from(JSON.stringify({ metadata: { planId: 'it-plan-c' } }), 'utf-8')
        ),
        deps.fetcher
      )
    ).rejects.toThrow('PLAN_BYTES_NOT_REGISTERED');
  });

  it('resolves registered plan bytes even when the requested PlanRef omits optional sizeBytes metadata', async () => {
    const planBytes = Buffer.from(JSON.stringify({ metadata: { planId: 'it-plan-a' } }), 'utf-8');
    const registeredPlanRef = createPlanRef('it-plan-a', planBytes);
    const requestedPlanRef = {
      uri: registeredPlanRef.uri,
      sha256: registeredPlanRef.sha256,
      schemaVersion: registeredPlanRef.schemaVersion,
      planId: registeredPlanRef.planId,
      planVersion: registeredPlanRef.planVersion,
    };
    const ctx = withDbtRunExecutionContext(createRunContext(RunId.of('run-1')), registeredPlanRef);

    const deps = createMultiRunDbtActivityDeps(new TestStateStore(), new TestOutbox(), [
      { ctx, planRef: registeredPlanRef, planBytes },
    ]);

    const fetched = await deps.integrity.fetchAndValidate(requestedPlanRef, deps.fetcher);

    expect(Buffer.from(fetched).toString('utf-8')).toBe(Buffer.from(planBytes).toString('utf-8'));
  });

  it('rejects multi-run bindings that omit plan bytes instead of falling back to a shared blob', () => {
    const firstPlanBytes = Buffer.from(
      JSON.stringify({ metadata: { planId: 'it-plan-a' } }),
      'utf-8'
    );
    const secondPlanBytes = Buffer.from(
      JSON.stringify({ metadata: { planId: 'it-plan-b' } }),
      'utf-8'
    );
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
      createMultiRunDbtActivityDeps(new TestStateStore(), new TestOutbox(), [
        { ctx: firstContext, planRef: firstPlanRef, planBytes: firstPlanBytes },
        { ctx: secondContext, planRef: secondPlanRef } as never,
      ])
    ).toThrow('DBT_MULTI_RUN_PLAN_BYTES_REQUIRED');
  });

  it('rejects bindings whose precomputed runExecutionContextRef no longer matches the registered plan', () => {
    const firstPlanBytes = Buffer.from(
      JSON.stringify({ metadata: { planId: 'it-plan-a' } }),
      'utf-8'
    );
    const secondPlanBytes = Buffer.from(
      JSON.stringify({ metadata: { planId: 'it-plan-b' } }),
      'utf-8'
    );
    const firstPlanRef = createPlanRef('it-plan-a', firstPlanBytes);
    const secondPlanRef = createPlanRef('it-plan-b', secondPlanBytes);
    const contextBoundToFirstPlan = withDbtRunExecutionContext(
      createRunContext(RunId.of('run-1')),
      firstPlanRef
    );

    expect(() =>
      createMultiRunDbtActivityDeps(new TestStateStore(), new TestOutbox(), [
        { ctx: contextBoundToFirstPlan, planRef: secondPlanRef, planBytes: secondPlanBytes },
      ])
    ).toThrow('RUN_EXECUTION_CONTEXT_PLAN_REF_MISMATCH');
  });
});
