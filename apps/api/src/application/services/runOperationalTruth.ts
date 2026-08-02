import type { CanonicalRunStatus, RunMetadata } from '@dvt/contracts';

import type { RunOperationalTruthDto } from '../ports/runtime.js';

import { projectRunControlAvailability } from './runControlPolicy.js';

export interface RunOperationalTruthEvidence {
  readonly currentStepId?: string;
  readonly failedStepId?: string;
  readonly errorReason?: string;
}

export interface ProjectRunOperationalTruthInput {
  readonly metadata: RunMetadata;
  readonly status: CanonicalRunStatus;
  readonly evidence?: RunOperationalTruthEvidence;
  readonly recoveryContextTrusted?: boolean;
}

export function projectRunOperationalTruth(
  input: ProjectRunOperationalTruthInput
): RunOperationalTruthDto {
  const { metadata } = input;
  const status = sanitizeCanonicalRunStatus(input.status);
  const failure = status.execution?.failure;
  const durationMs = deriveDurationMs(status.startedAt, status.completedAt);
  const currentStepId = status.execution?.activeStepId ?? input.evidence?.currentStepId;
  const failedStepId = failure?.stepId ?? input.evidence?.failedStepId;
  const errorReason = failure?.reason ?? failure?.message ?? input.evidence?.errorReason;

  return {
    tenantId: metadata.tenantId,
    projectId: metadata.projectId,
    environmentId: metadata.environmentId,
    runId: metadata.runId,
    planId: metadata.planId,
    planVersion: metadata.planVersion,
    logicalAttemptId: metadata.logicalAttemptId,
    provider: metadata.providerRef.provider,
    ...(metadata.createdAt === undefined ? {} : { createdAt: metadata.createdAt }),
    status: status.status,
    ...(status.substatus === undefined ? {} : { substatus: status.substatus }),
    ...(status.message === undefined ? {} : { message: status.message }),
    ...(status.startedAt === undefined ? {} : { startedAt: status.startedAt }),
    ...(status.completedAt === undefined ? {} : { completedAt: status.completedAt }),
    ...(durationMs === undefined ? {} : { durationMs }),
    ...(status.execution === undefined ? {} : { execution: status.execution }),
    ...(currentStepId === undefined ? {} : { currentStepId }),
    ...(failedStepId === undefined ? {} : { failedStepId }),
    ...(errorReason === undefined ? {} : { errorReason }),
    controls: projectRunControlAvailability(status, input.recoveryContextTrusted ?? true),
  };
}

export function sanitizeCanonicalRunStatus(status: CanonicalRunStatus): CanonicalRunStatus {
  if (status.status === 'COMPLETED' || status.execution?.materialization === undefined) {
    return status;
  }

  const { execution: _previousExecution, ...statusWithoutExecution } = status;
  const { materialization: _materialization, ...execution } = status.execution;

  return {
    ...statusWithoutExecution,
    ...(Object.keys(execution).length === 0 ? {} : { execution }),
  };
}

function deriveDurationMs(startedAt: string | undefined, completedAt: string | undefined) {
  if (startedAt === undefined || completedAt === undefined) {
    return undefined;
  }

  const startedEpoch = Date.parse(startedAt);
  const completedEpoch = Date.parse(completedAt);
  if (!Number.isFinite(startedEpoch) || !Number.isFinite(completedEpoch)) {
    return undefined;
  }

  const durationMs = completedEpoch - startedEpoch;
  return durationMs >= 0 ? durationMs : undefined;
}
