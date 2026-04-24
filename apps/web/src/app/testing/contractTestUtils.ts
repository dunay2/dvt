import {
  asIsoUtcString,
  asNonBlankString,
  asStepId,
  type EngineRunRef,
  type PlanRef,
  type RunContext,
} from '@dvt/contracts';

export const nb = asNonBlankString;
export const iso = asIsoUtcString;
export const stepId = asStepId;

export function makeRunContext(
  runId: string,
  overrides?: Partial<{
    tenantId: string;
    projectId: string;
    environmentId: string;
    targetAdapter: RunContext['targetAdapter'];
  }>
): RunContext {
  return {
    tenantId: nb(overrides?.tenantId ?? 'tenant-a'),
    projectId: nb(overrides?.projectId ?? 'project-a'),
    environmentId: nb(overrides?.environmentId ?? 'env-a'),
    targetAdapter: overrides?.targetAdapter ?? 'temporal',
    runId: nb(runId),
  };
}

export function makePlanRef(
  overrides?: Partial<{
    uri: string;
    sha256: string;
    schemaVersion: string;
    planId: string;
    planVersion: string;
    sizeBytes: number;
    expiresAt: string;
  }>
): PlanRef {
  return {
    uri: nb(overrides?.uri ?? 'dvt-plan://plans/default'),
    sha256: nb(overrides?.sha256 ?? 'a'.repeat(64)),
    schemaVersion: nb(overrides?.schemaVersion ?? 'v1.2'),
    planId: nb(overrides?.planId ?? 'plan-default'),
    planVersion: nb(overrides?.planVersion ?? '1.0'),
    ...(overrides?.sizeBytes === undefined ? {} : { sizeBytes: overrides.sizeBytes }),
    ...(overrides?.expiresAt === undefined ? {} : { expiresAt: iso(overrides.expiresAt) }),
  };
}

export function makeTemporalRunRef(
  overrides?: Partial<{
    tenantId: string;
    namespace: string;
    workflowId: string;
    runId: string;
    taskQueue: string;
  }>
): Extract<EngineRunRef, { provider: 'temporal' }> {
  return {
    provider: 'temporal',
    tenantId: nb(overrides?.tenantId ?? 'tenant-a'),
    namespace: nb(overrides?.namespace ?? 'default'),
    workflowId: nb(overrides?.workflowId ?? 'wf-run-1'),
    runId: nb(overrides?.runId ?? 'run-1'),
    ...(overrides?.taskQueue === undefined ? {} : { taskQueue: nb(overrides.taskQueue) }),
  };
}
