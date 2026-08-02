/**
 * Owned concern: validate and decode runtime API response fields into typed
 * presentation DTOs, rejecting malformed or unexpected payload shapes early.
 */
import type { RunStatus as ContractRunStatus } from '@dvt/contracts';

import type {
  MaterializationEvidence,
  RunControlActionAvailability,
  RunControlAvailability,
  RunControlUnavailableReason,
  RunDiagnosticPointer,
  RunDiagnostics,
  RunAuthoringProvenance,
  RunExecutionEvidence,
  RunExecutor,
  RunFailureEvidence,
  RunGitArtifactRef,
  RunPlanExecutionSummary,
  RunProvenanceChain,
  UiRunStatus,
} from '../../ports/runs';

const RUN_CONTROL_UNAVAILABLE_REASONS = new Set<RunControlUnavailableReason>([
  'cancellation_pending',
  'dispatch_pending',
  'run_active',
  'run_cancelled',
  'run_completed',
  'run_terminal',
  'source_plan_unavailable',
  'source_context_untrusted',
]);

export function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export function asFiniteInteger(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value)) {
    return undefined;
  }

  return value;
}

export function asFiniteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function parseRunControlAction(value: unknown): RunControlActionAvailability | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const candidate = value as Record<string, unknown>;
  if (candidate.available === true) return { available: true };
  if (
    candidate.available === false &&
    typeof candidate.reason === 'string' &&
    RUN_CONTROL_UNAVAILABLE_REASONS.has(candidate.reason as RunControlUnavailableReason)
  ) {
    return {
      available: false,
      reason: candidate.reason as RunControlUnavailableReason,
    };
  }
  return undefined;
}

export function parseRunControlAvailability(value: unknown): RunControlAvailability | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const candidate = value as Record<string, unknown>;
  const cancel = parseRunControlAction(candidate.cancel);
  const recover = parseRunControlAction(candidate.recover);
  return cancel === undefined || recover === undefined ? undefined : { cancel, recover };
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

export function parseSnapshotStaleness(value: unknown): 'FRESH' | 'STALE' | 'UNKNOWN' | undefined {
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
      return 'unknown';
  }
}

export function parseMaterializationEvidence(value: unknown): MaterializationEvidence | undefined {
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

function parseNonEmptyStringArray(value: unknown): readonly string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const strings = value.filter(
    (candidate): candidate is string => typeof candidate === 'string' && candidate.trim().length > 0
  );

  return strings.length === value.length && strings.length > 0 ? strings : undefined;
}

export function parsePlanExecutionSummary(value: unknown): RunPlanExecutionSummary | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const candidate = value as Record<string, unknown>;
  const executor = parseRunExecutor(candidate.executor);
  const nodeCount = asFiniteInteger(candidate.nodeCount);
  const stepCount = asFiniteInteger(candidate.stepCount);
  const sourceTables = parseNonEmptyStringArray(candidate.sourceTables);
  const sinkTables = parseNonEmptyStringArray(candidate.sinkTables);

  if (
    executor === undefined ||
    nodeCount === undefined ||
    stepCount === undefined ||
    sourceTables === undefined ||
    sinkTables === undefined
  ) {
    return undefined;
  }

  return {
    executor,
    nodeCount,
    stepCount,
    sourceTables,
    sinkTables,
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

function parseRunDiagnosticPointer(value: unknown): RunDiagnosticPointer | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const candidate = value as Record<string, unknown>;
  const kind = candidate.kind === 'trace' || candidate.kind === 'log' ? candidate.kind : undefined;
  const label = asString(candidate.label);
  const pointerValue = asString(candidate.value);

  if (kind === undefined || label === undefined || pointerValue === undefined) {
    return undefined;
  }

  return {
    kind,
    label,
    value: pointerValue,
  };
}

function parseRunDiagnosticPointers(value: unknown): readonly RunDiagnosticPointer[] | undefined {
  if (!Array.isArray(value) || value.length === 0) {
    return undefined;
  }

  const pointers = value.map(parseRunDiagnosticPointer);
  if (pointers.some((pointer) => pointer === undefined)) {
    return undefined;
  }

  return pointers as readonly RunDiagnosticPointer[];
}

export function parseRunDiagnostics(value: unknown): RunDiagnostics | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const candidate = value as Record<string, unknown>;
  const runId = asString(candidate.runId);
  const contractStatus = parseContractRunStatus(candidate.status);
  const pointers = parseRunDiagnosticPointers(candidate.pointers);
  if (runId === undefined || contractStatus === undefined || pointers === undefined) {
    return undefined;
  }

  const planId = asString(candidate.planId);
  const planSha = asString(candidate.planSha);
  const stepId = asString(candidate.stepId);
  const attemptId = asString(candidate.attemptId);
  const adapter = asString(candidate.adapter);
  const durationMs = asFiniteNumber(candidate.durationMs);
  const errorCode = asString(candidate.errorCode);

  return {
    runId,
    ...(planId ? { planId } : {}),
    ...(planSha ? { planSha } : {}),
    ...(stepId ? { stepId } : {}),
    ...(attemptId ? { attemptId } : {}),
    ...(adapter ? { adapter } : {}),
    ...(durationMs === undefined ? {} : { durationMs }),
    status: mapContractStatusToUi(contractStatus),
    ...(errorCode ? { errorCode } : {}),
    pointers,
  };
}
