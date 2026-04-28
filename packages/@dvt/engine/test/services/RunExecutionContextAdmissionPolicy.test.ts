import type {
  ExecutionPlan,
  PlanRef,
  ResolvedRunContext,
  RunExecutionContext,
  RunExecutionPolicy,
} from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import type { IRunExecutionContextBindingPolicy } from '../../src/ports/IRunExecutionContextBindingPolicy.js';
import { RunExecutionContextAdmissionPolicy } from '../../src/services/startRun/RunExecutionContextAdmissionPolicy.js';

const EXAMPLE_PLUGIN_STEP_KINDS = ['EXAMPLE_MODEL', 'EXAMPLE_TEST', 'EXAMPLE_SNAPSHOT'] as const;
const allowBindingPolicy = createExampleBindingPolicy();

function makePlanRef(): PlanRef {
  return {
    uri: 'https://example.com/plan',
    sha256: 'plan-sha',
    schemaVersion: 'v1.2',
    planId: 'plan-1',
    planVersion: '1.0',
  };
}

function makeExecutionPolicy(overrides?: Partial<RunExecutionPolicy>): RunExecutionPolicy {
  return {
    pluginCompatibilityFingerprint:
      '1111111111111111111111111111111111111111111111111111111111111111',
    ...overrides,
  };
}

function makePlan(stepKinds: readonly string[] = ['EXAMPLE_MODEL']): ExecutionPlan {
  return {
    metadata: {
      planId: 'plan-1',
      planVersion: '1.0',
      schemaVersion: 'v1.2',
      contractVersion: '1.0.0',
      inputHashSha256: 'c'.repeat(64),
      createdAtIso: '2026-04-14T00:00:00.000Z',
    },
    steps: stepKinds.map((kind, index) => ({
      stepId: `step-${index + 1}`,
      kind,
      dependsOn: [],
    })),
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
      pluginCompatibilityFingerprint:
        '1111111111111111111111111111111111111111111111111111111111111111',
    },
  };
}

function makeRunExecutionContext(overrides?: Partial<RunExecutionContext>): RunExecutionContext {
  return {
    schemaVersion: 'v1.0',
    planId: 'plan-1',
    planVersion: '1.0',
    planSha256: 'plan-sha',
    pluginCompatibilityFingerprint:
      '1111111111111111111111111111111111111111111111111111111111111111',
    tenantId: 'tenant-a',
    projectId: 'project-a',
    environmentId: 'prod',
    targetAdapter: 'temporal',
    createdAtIso: '2026-04-03T00:00:00.000Z',
    createdBy: 'tests',
    pluginContexts: {
      example: {
        artifactRef: {
          uri: `s3://bundle-bucket/tenants/tenant-a/${'b'.repeat(64)}`,
          kind: 'example-plugin-artifact',
          sha256: 'b'.repeat(64),
          tenantId: 'tenant-a',
        },
      },
    },
    ...overrides,
  };
}

function createExampleBindingPolicy(
  assertAllowed: (pluginContext: unknown) => void = () => undefined
): IRunExecutionContextBindingPolicy {
  return {
    pluginRequirements: [
      {
        pluginId: 'example',
        stepKinds: EXAMPLE_PLUGIN_STEP_KINDS,
        assertPluginContextAllowed({ pluginContext, context }) {
          const tenantId = readExampleArtifactTenantId(pluginContext);
          if (tenantId !== context.tenantId) {
            throw new Error(
              `runExecutionContext.pluginContexts.example.artifactRef.tenantId mismatch: expected=${context.tenantId} actual=${tenantId}`
            );
          }

          assertAllowed(pluginContext);
        },
      },
    ],
  };
}

function createSqlBindingPolicy(): IRunExecutionContextBindingPolicy {
  return {
    pluginRequirements: [
      {
        pluginId: 'sql',
        stepKinds: ['SQL_TRANSFORM'],
        assertPluginContextAllowed() {},
      },
    ],
  };
}

function readExampleArtifactTenantId(pluginContext: unknown): string {
  if (pluginContext === null || typeof pluginContext !== 'object') {
    throw new Error('runExecutionContext.pluginContexts.example invalid for plugin-bearing plan');
  }

  const artifactRef = (pluginContext as { artifactRef?: unknown }).artifactRef;
  if (artifactRef === null || typeof artifactRef !== 'object') {
    throw new Error('runExecutionContext.pluginContexts.example invalid for plugin-bearing plan');
  }

  const tenantId = (artifactRef as { tenantId?: unknown }).tenantId;
  if (typeof tenantId !== 'string') {
    throw new Error('runExecutionContext.pluginContexts.example invalid for plugin-bearing plan');
  }

  return tenantId;
}

describe('RunExecutionContextAdmissionPolicy', () => {
  it('accepts aligned plan/context/runExecutionContext', async () => {
    const policy = new RunExecutionContextAdmissionPolicy({
      resolver: {
        async resolve() {
          return makeRunExecutionContext();
        },
      },
      bindingPolicy: allowBindingPolicy,
    });

    await expect(
      policy.assertAllowed(makePlan(), makePlanRef(), makeExecutionPolicy(), makeContext())
    ).resolves.toBeUndefined();
  });

  it('accepts non-plugin plans without a runExecutionContextRef', async () => {
    const policy = new RunExecutionContextAdmissionPolicy();

    await expect(
      policy.assertAllowed(
        makePlan(['POSTGRES_SQL_TRANSFORM']),
        makePlanRef(),
        makeExecutionPolicy(),
        { ...makeContext(), runExecutionContextRef: undefined }
      )
    ).resolves.toBeUndefined();
  });

  it.each(EXAMPLE_PLUGIN_STEP_KINDS)(
    'rejects %s plans when runExecutionContextRef is missing',
    async (stepKind) => {
      const policy = new RunExecutionContextAdmissionPolicy({
        bindingPolicy: allowBindingPolicy,
      });

      await expect(
        policy.assertAllowed(makePlan([stepKind]), makePlanRef(), makeExecutionPolicy(), {
          ...makeContext(),
          runExecutionContextRef: undefined,
        })
      ).rejects.toMatchObject({ code: 'RUN_EXECUTION_CONTEXT_REJECTED' });
    }
  );

  it('rejects future SQL plugin plans through the same plugin requirement seam', async () => {
    const policy = new RunExecutionContextAdmissionPolicy({
      bindingPolicy: createSqlBindingPolicy(),
    });

    await expect(
      policy.assertAllowed(makePlan(['SQL_TRANSFORM']), makePlanRef(), makeExecutionPolicy(), {
        ...makeContext(),
        runExecutionContextRef: undefined,
      })
    ).rejects.toMatchObject({ code: 'RUN_EXECUTION_CONTEXT_REJECTED' });
  });

  it('rejects plugin-bearing plans when runExecutionContextRef is missing', async () => {
    const policy = new RunExecutionContextAdmissionPolicy({
      bindingPolicy: allowBindingPolicy,
    });

    await expect(
      policy.assertAllowed(makePlan(), makePlanRef(), makeExecutionPolicy(), {
        ...makeContext(),
        runExecutionContextRef: undefined,
      })
    ).rejects.toMatchObject({ code: 'RUN_EXECUTION_CONTEXT_REJECTED' });
  });

  it('rejects when runExecutionContextRef is provided without resolver', async () => {
    const policy = new RunExecutionContextAdmissionPolicy();
    await expect(
      policy.assertAllowed(makePlan(), makePlanRef(), makeExecutionPolicy(), makeContext())
    ).rejects.toMatchObject({ code: 'RUN_EXECUTION_CONTEXT_REJECTED' });
  });

  it('allows plugin-shaped plans when no matching plugin requirement is configured in this engine', async () => {
    const policy = new RunExecutionContextAdmissionPolicy({
      resolver: {
        async resolve() {
          return makeRunExecutionContext();
        },
      },
    });

    await expect(
      policy.assertAllowed(makePlan(), makePlanRef(), makeExecutionPolicy(), makeContext())
    ).resolves.toBeUndefined();
  });

  it.each([
    ['tenantId', makeRunExecutionContext({ tenantId: 'tenant-b' })],
    ['projectId', makeRunExecutionContext({ projectId: 'project-b' })],
    ['environmentId', makeRunExecutionContext({ environmentId: 'staging' })],
    ['planId', makeRunExecutionContext({ planId: 'plan-2' })],
    ['planVersion', makeRunExecutionContext({ planVersion: '2.0' })],
    ['planSha256', makeRunExecutionContext({ planSha256: 'different-sha' })],
  ])('rejects %s mismatch', async (_field, runExecutionContext) => {
    const policy = new RunExecutionContextAdmissionPolicy({
      resolver: {
        async resolve() {
          return runExecutionContext;
        },
      },
      bindingPolicy: allowBindingPolicy,
    });

    await expect(
      policy.assertAllowed(makePlan(), makePlanRef(), makeExecutionPolicy(), makeContext())
    ).rejects.toMatchObject({ code: 'RUN_EXECUTION_CONTEXT_REJECTED' });
  });

  it('rejects plugin-bearing plans when the resolved context omits the required plugin context', async () => {
    const policy = new RunExecutionContextAdmissionPolicy({
      resolver: {
        async resolve() {
          return makeRunExecutionContext({
            pluginContexts: {},
          });
        },
      },
      bindingPolicy: allowBindingPolicy,
    });

    await expect(
      policy.assertAllowed(makePlan(), makePlanRef(), makeExecutionPolicy(), makeContext())
    ).rejects.toMatchObject({ code: 'RUN_EXECUTION_CONTEXT_REJECTED' });
  });

  it('rejects plugin-bearing plans when artifact tenantId mismatches the run context', async () => {
    const policy = new RunExecutionContextAdmissionPolicy({
      resolver: {
        async resolve() {
          return makeRunExecutionContext({
            pluginContexts: {
              example: {
                artifactRef: {
                  uri: `s3://bundle-bucket/tenants/tenant-b/${'b'.repeat(64)}`,
                  kind: 'example-plugin-artifact',
                  sha256: 'b'.repeat(64),
                  tenantId: 'tenant-b',
                },
              },
            },
          });
        },
      },
      bindingPolicy: allowBindingPolicy,
    });

    await expect(
      policy.assertAllowed(makePlan(), makePlanRef(), makeExecutionPolicy(), makeContext())
    ).rejects.toMatchObject({ code: 'RUN_EXECUTION_CONTEXT_REJECTED' });
  });

  it('rejects pluginCompatibilityFingerprint mismatch against executionPolicy', async () => {
    const policy = new RunExecutionContextAdmissionPolicy({
      resolver: {
        async resolve() {
          return makeRunExecutionContext({
            pluginCompatibilityFingerprint:
              '2222222222222222222222222222222222222222222222222222222222222222',
          });
        },
      },
      bindingPolicy: allowBindingPolicy,
    });

    await expect(
      policy.assertAllowed(makePlan(), makePlanRef(), makeExecutionPolicy(), makeContext())
    ).rejects.toMatchObject({ code: 'RUN_EXECUTION_CONTEXT_REJECTED' });
  });

  it('rejects compatibility-checked plan when resolved context omits fingerprint', async () => {
    const policy = new RunExecutionContextAdmissionPolicy({
      resolver: {
        async resolve() {
          return makeRunExecutionContext({
            pluginCompatibilityFingerprint: undefined,
          });
        },
      },
      bindingPolicy: allowBindingPolicy,
    });

    await expect(
      policy.assertAllowed(makePlan(), makePlanRef(), makeExecutionPolicy(), makeContext())
    ).rejects.toMatchObject({ code: 'RUN_EXECUTION_CONTEXT_REJECTED' });
  });

  it('ignores context fingerprints when executionPolicy has no compatibility fingerprint', async () => {
    const policy = new RunExecutionContextAdmissionPolicy({
      resolver: {
        async resolve() {
          return makeRunExecutionContext({
            pluginCompatibilityFingerprint:
              '2222222222222222222222222222222222222222222222222222222222222222',
          });
        },
      },
      bindingPolicy: allowBindingPolicy,
    });

    await expect(
      policy.assertAllowed(
        makePlan(),
        makePlanRef(),
        makeExecutionPolicy({ pluginCompatibilityFingerprint: undefined }),
        makeContext()
      )
    ).resolves.toBeUndefined();
  });

  it('rejects plugin-bearing plans when the binding policy rejects the artifact locator', async () => {
    const policy = new RunExecutionContextAdmissionPolicy({
      resolver: {
        async resolve() {
          return makeRunExecutionContext();
        },
      },
      bindingPolicy: createExampleBindingPolicy(() => {
        throw new Error('plugin artifact bucket mismatch: expected=canonical actual=foreign');
      }),
    });

    await expect(
      policy.assertAllowed(makePlan(), makePlanRef(), makeExecutionPolicy(), makeContext())
    ).rejects.toMatchObject({
      code: 'RUN_EXECUTION_CONTEXT_REJECTED',
      messageParams: {
        reason: 'plugin artifact bucket mismatch: expected=canonical actual=foreign',
      },
    });
  });
});
