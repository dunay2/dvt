import { createHash } from 'node:crypto';

import {
  asNonBlankString,
  asSha256HexString,
  parseExecutionPlan,
  type ExecutionPlan,
  type PlanRef,
  type ResolvedRunContext,
} from '@dvt/contracts';

import { createExecutionPlan } from '../contractFixtures.js';

import { RunId } from './runtimeState.js';

export const INTEGRATION_PLAN_OWNERSHIP = {
  tenantId: 't-it',
  projectId: 'p-it',
  environmentId: 'test',
} as const;

export function createPlanOwnershipFromContext(
  ctx: Pick<ResolvedRunContext, 'tenantId' | 'projectId' | 'environmentId'>
): NonNullable<ExecutionPlan['metadata']['ownership']> {
  return {
    tenantId: ctx.tenantId,
    projectId: ctx.projectId,
    environmentId: ctx.environmentId,
  };
}

export function createPlanRef(
  planId: string,
  planBytes: Uint8Array,
  options?: {
    uri?: string;
  }
): PlanRef {
  const plan = parseExecutionPlan(JSON.parse(Buffer.from(planBytes).toString('utf-8')) as unknown);

  return {
    uri: asNonBlankString(options?.uri ?? `memory://plans/${planId}.json`),
    sha256: asSha256HexString(sha256Hex(planBytes)),
    schemaVersion: asNonBlankString(plan.metadata.schemaVersion),
    planId: asNonBlankString(plan.metadata.planId),
    planVersion: asNonBlankString(plan.metadata.planVersion),
    sizeBytes: planBytes.byteLength,
  };
}

export function createRunContext(
  runId: RunId,
  overrides: {
    tenantId?: string;
    projectId?: string;
    environmentId?: string;
    originRunId?: string;
    logicalAttemptId?: number;
    targetAdapter?: ResolvedRunContext['targetAdapter'];
  } = {}
): ResolvedRunContext {
  const runIdValue = runId.value;

  return {
    tenantId: asNonBlankString(overrides.tenantId ?? 't-it'),
    projectId: asNonBlankString(overrides.projectId ?? 'p-it'),
    environmentId: asNonBlankString(overrides.environmentId ?? 'test'),
    runId: asNonBlankString(runIdValue),
    targetAdapter: overrides.targetAdapter ?? 'temporal',
    logicalAttemptId: overrides.logicalAttemptId ?? 1,
    originRunId: asNonBlankString(overrides.originRunId ?? runIdValue),
  };
}

function createDbtModelStep(
  stepId: string,
  dependsOn: readonly string[] = []
): ExecutionPlan['steps'][number] {
  return {
    stepId,
    kind: 'DBT_MODEL',
    dependsOn: [...dependsOn],
  };
}

export function mkPlan(stepCount: number): ExecutionPlan {
  return createExecutionPlan({
    inputHashSha256: sha256Hex(Buffer.from('fixture:it-plan', 'utf-8')),
    ownership: INTEGRATION_PLAN_OWNERSHIP,
    steps: Array.from({ length: stepCount }, (_, index) => createDbtModelStep(`s-${index + 1}`)),
  });
}

export function mkLinearPlan(stepCount: number): ExecutionPlan {
  return createExecutionPlan({
    inputHashSha256: sha256Hex(Buffer.from('fixture:it-plan-linear', 'utf-8')),
    ownership: INTEGRATION_PLAN_OWNERSHIP,
    steps: Array.from({ length: stepCount }, (_, index) =>
      createDbtModelStep(`s-${index + 1}`, index === 0 ? [] : [`s-${index}`])
    ),
  });
}

export function mkLinearThreeStepPlan(): ExecutionPlan {
  return createExecutionPlan({
    inputHashSha256: sha256Hex(Buffer.from('fixture:it-plan-linear-3', 'utf-8')),
    ownership: INTEGRATION_PLAN_OWNERSHIP,
    steps: Array.from({ length: 3 }, (_, index) =>
      createDbtModelStep(`s-${index + 1}`, index === 0 ? [] : [`s-${index}`])
    ),
  });
}

export function mkPermanentFailurePlan(): ExecutionPlan {
  return createExecutionPlan({
    inputHashSha256: sha256Hex(Buffer.from('fixture:it-plan-permanent-failure', 'utf-8')),
    ownership: INTEGRATION_PLAN_OWNERSHIP,
    steps: [createDbtModelStep('s-fail')],
  });
}

export function withTransformationRuntimeBinding<T extends Record<string, unknown>>(
  plan: T,
  executor: 'postgres' | 'dbt'
): T {
  const currentObservability =
    typeof plan['observability'] === 'object' && plan['observability'] !== null
      ? (plan['observability'] as Record<string, unknown>)
      : {};
  const currentExtra =
    typeof currentObservability['extra'] === 'object' && currentObservability['extra'] !== null
      ? (currentObservability['extra'] as Record<string, unknown>)
      : {};

  return {
    ...plan,
    observability: {
      ...currentObservability,
      extra: {
        ...currentExtra,
        transformationFlowRuntime: {
          previewProfile: 'planner-generic-v1',
          executor,
        },
      },
    },
  };
}

function sha256Hex(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}
