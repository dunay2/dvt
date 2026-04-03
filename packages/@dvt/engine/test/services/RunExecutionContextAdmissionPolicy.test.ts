import type { PlanRef, ResolvedRunContext, RunExecutionContext } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import { RunExecutionContextAdmissionPolicy } from '../../src/services/startRun/RunExecutionContextAdmissionPolicy.js';

function makePlanRef(): PlanRef {
  return {
    uri: 'https://example.com/plan',
    sha256: 'plan-sha',
    schemaVersion: 'v1.2',
    planId: 'plan-1',
    planVersion: '1.0',
  };
}

function makeContext(): ResolvedRunContext {
  return {
    tenantId: 'tenant-a',
    projectId: 'project-a',
    environmentId: 'prod',
    runId: 'run-1',
    targetAdapter: 'temporal',
    logicalAttemptId: 1,
    originRunId: 'run-1',
    runExecutionContextRef: {
      uri: 'dvt-runctx://tenant-a/run-1/context.json',
      sha256: 'ctx-sha',
      schemaVersion: 'v1.0',
      planId: 'plan-1',
      planVersion: '1.0',
    },
  };
}

function makeRunExecutionContext(overrides?: Partial<RunExecutionContext>): RunExecutionContext {
  return {
    schemaVersion: 'v1.0',
    planId: 'plan-1',
    planVersion: '1.0',
    planSha256: 'plan-sha',
    tenantId: 'tenant-a',
    projectId: 'project-a',
    environmentId: 'prod',
    targetAdapter: 'temporal',
    createdAtIso: '2026-04-03T00:00:00.000Z',
    createdBy: 'tests',
    pluginContexts: {
      dbt: {
        projectBundleRef: 'artifacts://plans/run-1/project.tgz',
      },
    },
    ...overrides,
  };
}

describe('RunExecutionContextAdmissionPolicy', () => {
  it('accepts aligned plan/context/runExecutionContext', async () => {
    const policy = new RunExecutionContextAdmissionPolicy({
      async resolve() {
        return makeRunExecutionContext();
      },
    });

    await expect(policy.assertAllowed(makePlanRef(), makeContext())).resolves.toBeUndefined();
  });

  it('rejects when runExecutionContextRef is provided without resolver', async () => {
    const policy = new RunExecutionContextAdmissionPolicy();
    await expect(policy.assertAllowed(makePlanRef(), makeContext())).rejects.toMatchObject({
      code: 'RUN_EXECUTION_CONTEXT_REJECTED',
    });
  });

  it.each([
    ['tenantId', makeRunExecutionContext({ tenantId: 'tenant-b' })],
    ['projectId', makeRunExecutionContext({ projectId: 'project-b' })],
    ['environmentId', makeRunExecutionContext({ environmentId: 'staging' })],
    ['planId', makeRunExecutionContext({ planId: 'plan-2' })],
    ['planVersion', makeRunExecutionContext({ planVersion: '2.0' })],
    ['planSha256', makeRunExecutionContext({ planSha256: 'different-sha' })],
    ['targetAdapter', makeRunExecutionContext({ targetAdapter: 'conductor' })],
  ])('rejects %s mismatch', async (_field, runExecutionContext) => {
    const policy = new RunExecutionContextAdmissionPolicy({
      async resolve() {
        return runExecutionContext;
      },
    });

    await expect(policy.assertAllowed(makePlanRef(), makeContext())).rejects.toMatchObject({
      code: 'RUN_EXECUTION_CONTEXT_REJECTED',
    });
  });
});
