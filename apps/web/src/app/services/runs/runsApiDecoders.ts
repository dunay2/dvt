import type { RunStatus as ContractRunStatus } from '@dvt/contracts';

import type {
  MaterializationEvidence,
  RunAuthoringProvenance,
  RunExecutionEvidence,
  RunExecutor,
  RunFailureEvidence,
  RunGitArtifactRef,
  RunProvenanceChain,
  UiRunStatus,
} from '../../ports/runs';

export function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export function asFiniteInteger(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value)) {
    return undefined;
  }

  return value;
}

function asFiniteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export function parseRunExecutor(value: unknown): RunExecutor | undefined {
  return value === 'postgres' || value === 'dbt' ? value : undefined;
}

export function parseContractRunStatus(value: unknown): ContractRunStatus | undefined {
  switch (value) {
    case 'PENDING':
    case 'APPROVED':
    case 'RUNNING':
    case 'PAUSED':
    case 'COMPLETED':
    case 'FAILED':
    case 'CANCELLED':
      return value;
    default:
      return undefined;
  }
}

export function parseSnapshotStaleness(
  value: unknown
): 'FRESH' | 'STALE' | 'UNKNOWN' | undefined {
  switch (value) {
    case 'FRESH':
    case 'STALE':
    case 'UNKNOWN':
      return value;
    default:
      return undefined;
  }
}

export function mapContractStatusToUi(status: ContractRunStatus | undefined): UiRunStatus {
  switch (status) {
    case 'APPROVED':
    case 'PENDING':
      return 'pending';
    case 'RUNNING':
    case 'PAUSED':
      return 'running';
    case 'COMPLETED':
      return 'completed';
    case 'FAILED':
      return 'failed';
    case 'CANCELLED':
      return 'cancelled';
    default:
      return 'pending';
  }
}

export function parseMaterializationEvidence(
  value: unknown
): MaterializationEvidence | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const candidate = value as Record<string, unknown>;
  const executor = parseRunExecutor(candidate.executor);
  const environmentId = asString(candidate.environmentId);
  const sinkTable = asString(candidate.sinkTable);
  const rowsWritten = asFiniteNumber(candidate.rowsWritten);
  const startedAt = asString(candidate.startedAt);
  const completedAt = asString(candidate.completedAt);
  const durationMs = asFiniteNumber(candidate.durationMs);

  if (
    executor === undefined ||
    environmentId === undefined ||
    sinkTable === undefined ||
    rowsWritten === undefined ||
    startedAt === undefined ||
    completedAt === undefined ||
    durationMs === undefined
  ) {
    return undefined;
  }

  return {
    executor,
    environmentId,
    sinkTable,
    rowsWritten,
    startedAt,
    completedAt,
    durationMs,
  };
}

function parseFailureEvidence(value: unknown): RunFailureEvidence | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const candidate = value as Record<string, unknown>;
  const stepId = asString(candidate.stepId);
  const failedAt = asString(candidate.failedAt);
  const reason = asString(candidate.reason);
  const message = asString(candidate.message);

  if (stepId === undefined || failedAt === undefined) {
    return undefined;
  }

  return {
    stepId,
    failedAt,
    ...(reason ? { reason } : {}),
    ...(message ? { message } : {}),
  };
}

export function parseExecutionEvidence(value: unknown): RunExecutionEvidence | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const candidate = value as Record<string, unknown>;
  const activeStepId = asString(candidate.activeStepId);
  const failure = parseFailureEvidence(candidate.failure);
  const materialization = parseMaterializationEvidence(candidate.materialization);

  if (!activeStepId && !failure && !materialization) {
    return undefined;
  }

  return {
    ...(activeStepId ? { activeStepId } : {}),
    ...(failure ? { failure } : {}),
    ...(materialization ? { materialization } : {}),
  };
}

function parseGitArtifactRef(value: unknown): RunGitArtifactRef | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const candidate = value as Record<string, unknown>;
  const repo = asString(candidate.repo);
  const path = asString(candidate.path);
  const ref = asString(candidate.ref);
  const commitSha = asString(candidate.commitSha);
  const contentSha256 = asString(candidate.contentSha256);

  if (repo === undefined || path === undefined) {
    return undefined;
  }

  return {
    repo,
    path,
    ...(ref ? { ref } : {}),
    ...(commitSha ? { commitSha } : {}),
    ...(contentSha256 ? { contentSha256 } : {}),
  };
}

function parseAuthoringProvenance(value: unknown): RunAuthoringProvenance | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const candidate = value as Record<string, unknown>;
  const graphArtifact = parseGitArtifactRef(candidate.graphArtifact);
  const sqlArtifact = parseGitArtifactRef(candidate.sqlArtifact);

  if (!graphArtifact && !sqlArtifact) {
    return undefined;
  }

  return {
    ...(graphArtifact ? { graphArtifact } : {}),
    ...(sqlArtifact ? { sqlArtifact } : {}),
  };
}

export function parseRunProvenance(value: unknown): RunProvenanceChain | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const candidate = value as Record<string, unknown>;
  const persistedPlan =
    candidate.persistedPlan && typeof candidate.persistedPlan === 'object'
      ? (candidate.persistedPlan as Record<string, unknown>)
      : null;

  const planRecordId = persistedPlan ? asString(persistedPlan.planRecordId) : undefined;
  const planVersion = persistedPlan ? asString(persistedPlan.planVersion) : undefined;
  const sourceRef = persistedPlan ? asString(persistedPlan.sourceRef) : undefined;
  const canonicalPlanSha256 = persistedPlan
    ? asString(persistedPlan.canonicalPlanSha256)
    : undefined;

  if (
    planRecordId === undefined ||
    planVersion === undefined ||
    sourceRef === undefined ||
    canonicalPlanSha256 === undefined
  ) {
    return undefined;
  }

  const authoring = parseAuthoringProvenance(candidate.authoring);

  return {
    persistedPlan: {
      planRecordId,
      planVersion,
      sourceRef,
      canonicalPlanSha256,
    },
    ...(authoring ? { authoring } : {}),
  };
}
