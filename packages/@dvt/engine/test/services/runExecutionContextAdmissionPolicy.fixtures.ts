import type {
  ExecutionPlan,
  PlanRef,
  ResolvedRunContext,
  RunExecutionContext,
  RunExecutionPolicy,
} from '@dvt/contracts';

import type { IRunExecutionContextBindingPolicy } from '../../src/ports/IRunExecutionContextBindingPolicy.js';
import { RunExecutionContextAdmissionPolicy } from '../../src/services/startRun/RunExecutionContextAdmissionPolicy.js';

export const EXAMPLE_PLUGIN_STEP_KINDS = [
  'EXAMPLE_MODEL',
  'EXAMPLE_TEST',
  'EXAMPLE_SNAPSHOT',
] as const;

export const allowBindingPolicy = createExampleBindingPolicy();

export function makePlanRef(): PlanRef {
  return {
    uri: 'https://example.com/plan',
    sha256: 'plan-sha',
    schemaVersion: 'v1.2',
    planId: 'plan-1',
    planVersion: '1.0',
  };
}

export function makeExecutionPolicy(overrides?: Partial<RunExecutionPolicy>): RunExecutionPolicy {
  return {
    pluginCompatibilityFingerprint:
      '1111111111111111111111111111111111111111111111111111111111111111',
    ...overrides,
  };
}

export function makePlan(stepKinds: readonly string[] = ['EXAMPLE_MODEL']): ExecutionPlan {
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

export function makeContext(): ResolvedRunContext {
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

export function makeRunExecutionContext(
  overrides?: Partial<RunExecutionContext>
): RunExecutionContext {
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

export function createExampleBindingPolicy(
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
            throw new TypeError(
              `runExecutionContext.pluginContexts.example.artifactRef.tenantId mismatch: expected=${context.tenantId} actual=${tenantId}`
            );
          }

          assertAllowed(pluginContext);
        },
      },
    ],
  };
}

export function createSqlBindingPolicy(): IRunExecutionContextBindingPolicy {
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

export function createAdmissionPolicy(options?: {
  bindingPolicy?: IRunExecutionContextBindingPolicy;
  runExecutionContext?: RunExecutionContext;
}): RunExecutionContextAdmissionPolicy {
  return new RunExecutionContextAdmissionPolicy({
    bindingPolicy: options?.bindingPolicy,
    resolver:
      options?.runExecutionContext === undefined
        ? undefined
        : {
            async resolve() {
              return options.runExecutionContext;
            },
          },
  });
}

export function assertDefaultAdmission(
  policy: RunExecutionContextAdmissionPolicy,
  overrides?: {
    plan?: ExecutionPlan;
    planRef?: PlanRef;
    executionPolicy?: RunExecutionPolicy;
    context?: ResolvedRunContext;
  }
): Promise<void> {
  return policy.assertAllowed(
    overrides?.plan ?? makePlan(),
    overrides?.planRef ?? makePlanRef(),
    overrides?.executionPolicy ?? makeExecutionPolicy(),
    overrides?.context ?? makeContext()
  );
}

function readExampleArtifactTenantId(pluginContext: unknown): string {
  if (pluginContext === null || typeof pluginContext !== 'object') {
    throw new TypeError(
      'runExecutionContext.pluginContexts.example invalid for plugin-bearing plan'
    );
  }

  const artifactRef = (pluginContext as { artifactRef?: unknown }).artifactRef;
  if (artifactRef === null || typeof artifactRef !== 'object') {
    throw new TypeError(
      'runExecutionContext.pluginContexts.example invalid for plugin-bearing plan'
    );
  }

  const tenantId = (artifactRef as { tenantId?: unknown }).tenantId;
  if (typeof tenantId !== 'string') {
    throw new TypeError(
      'runExecutionContext.pluginContexts.example invalid for plugin-bearing plan'
    );
  }

  return tenantId;
}
