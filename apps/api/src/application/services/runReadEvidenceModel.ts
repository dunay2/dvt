import {
  MaterializationEvidenceSchema,
  type CanonicalRunStatus,
  parseExecutionPlan,
  TransformationExecutorSchema,
  type EventEnvelope,
  type MaterializationEvidence,
  type PlanRecord,
  type WorkflowSnapshot,
} from '@dvt/contracts';

type TransformationExecutor = 'postgres' | 'dbt';

interface RunGitArtifactRef {
  readonly repo: string;
  readonly path: string;
  readonly ref?: string;
  readonly commitSha?: string;
  readonly contentSha256?: string;
}

export interface RunReadEvidenceModel {
  readonly executor?: TransformationExecutor;
  readonly currentStepId?: string;
  readonly failedStepId?: string;
  readonly errorReason?: string;
  readonly provenance?: {
    persistedPlan: {
      planRecordId: PlanRecord['planId'];
      planVersion: PlanRecord['planVersion'];
      sourceRef: PlanRecord['sourceRef'];
      canonicalPlanSha256: PlanRecord['canonicalHash'];
    };
    authoring?: {
      graphArtifact?: RunGitArtifactRef;
      sqlArtifact?: RunGitArtifactRef;
    };
  };
  readonly materialization?: {
    executor: MaterializationEvidence['executor'];
    environmentId: MaterializationEvidence['environmentId'];
    sinkTable: MaterializationEvidence['sinkTable'];
    rowsWritten: number;
    startedAt: MaterializationEvidence['startedAt'];
    completedAt: MaterializationEvidence['completedAt'];
    durationMs: number;
  };
  readonly diagnostics?: {
    readonly runId: string;
    readonly planId?: string;
    readonly planSha?: string;
    readonly stepId?: string;
    readonly attemptId?: string;
    readonly adapter?: string;
    readonly durationMs?: number;
    readonly status: CanonicalRunStatus['status'];
    readonly errorCode?: string;
    readonly pointers: ReadonlyArray<{
      readonly kind: 'trace' | 'log';
      readonly label: string;
      readonly value: string;
    }>;
  };
}

export function deriveRunReadEvidenceModel(args: {
  snapshot: Pick<
    CanonicalRunStatus,
    'runId' | 'status' | 'execution' | 'startedAt' | 'completedAt'
  >;
  workflowSnapshot: WorkflowSnapshot | null;
  events?: ReadonlyArray<EventEnvelope>;
  planRecord?: PlanRecord;
  planId?: string;
  runtimeAdapter?: string;
}): RunReadEvidenceModel {
  const currentAttemptEvents = selectLatestLogicalAttemptEvents(args.events ?? []);
  const planExtra = readPlanObservabilityExtra(args.planRecord);
  const executor = deriveExecutor(currentAttemptEvents, args.snapshot.execution, planExtra);
  const currentStepId = deriveCurrentStepId(
    args.snapshot.status,
    args.workflowSnapshot,
    currentAttemptEvents
  );
  const failedStepId = deriveFailedStepId(
    args.snapshot.status,
    args.workflowSnapshot,
    currentAttemptEvents,
    args.snapshot.execution
  );
  const errorReason =
    args.snapshot.status === 'FAILED'
      ? deriveErrorReason(currentAttemptEvents, args.snapshot.execution)
      : undefined;
  const provenance = deriveProvenance(args.planRecord, planExtra);
  const materialization = deriveMaterialization(
    args.snapshot.status,
    currentAttemptEvents,
    args.snapshot.execution
  );
  const diagnostics = deriveDiagnostics({
    snapshot: args.snapshot,
    currentAttemptEvents,
    ...(args.planId === undefined ? {} : { planId: args.planId }),
    ...(args.planRecord === undefined ? {} : { planRecord: args.planRecord }),
    ...(args.runtimeAdapter === undefined ? {} : { runtimeAdapter: args.runtimeAdapter }),
    ...(executor === undefined ? {} : { executor }),
    ...(currentStepId === undefined ? {} : { currentStepId }),
    ...(failedStepId === undefined ? {} : { failedStepId }),
    ...(errorReason === undefined ? {} : { errorReason }),
    ...(materialization === undefined ? {} : { materialization }),
  });

  return {
    ...(executor === undefined ? {} : { executor }),
    ...(currentStepId === undefined ? {} : { currentStepId }),
    ...(failedStepId === undefined ? {} : { failedStepId }),
    ...(errorReason === undefined ? {} : { errorReason }),
    ...(provenance === undefined ? {} : { provenance }),
    ...(materialization === undefined ? {} : { materialization }),
    ...(diagnostics === undefined ? {} : { diagnostics }),
  };
}

function deriveExecutor(
  events: ReadonlyArray<EventEnvelope>,
  snapshotExecution: CanonicalRunStatus['execution'],
  planExtra?: Record<string, unknown>
): TransformationExecutor | undefined {
  if (snapshotExecution?.materialization) {
    return snapshotExecution.materialization.executor;
  }

  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index]!;
    if (!isRecord(event.payload)) {
      continue;
    }

    const fromResultEvidence = parseMaterialization(event.payload['resultEvidence'])?.executor;
    if (fromResultEvidence !== undefined) {
      return fromResultEvidence;
    }

    const fromExecutor = parseExecutor(event.payload['executor']);
    if (fromExecutor !== undefined) {
      return fromExecutor;
    }
  }

  if (!planExtra) {
    return undefined;
  }

  const runtimeBinding = planExtra['transformationFlowRuntime'];
  if (!isRecord(runtimeBinding)) {
    return undefined;
  }

  return parseExecutor(runtimeBinding['executor']);
}

function deriveCurrentStepId(
  status: CanonicalRunStatus['status'],
  workflowSnapshot: WorkflowSnapshot | null,
  events: ReadonlyArray<EventEnvelope>
): string | undefined {
  if (status !== 'RUNNING' && status !== 'PAUSED') {
    return undefined;
  }

  const fromSnapshot = deriveRunningStepFromSnapshot(workflowSnapshot);
  if (fromSnapshot !== undefined) {
    return fromSnapshot;
  }

  const terminalSteps = new Set<string>();
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index]!;
    if (!event.stepId) {
      continue;
    }

    if (
      event.eventType === 'StepCompleted' ||
      event.eventType === 'StepFailed' ||
      event.eventType === 'StepSkipped'
    ) {
      terminalSteps.add(event.stepId);
      continue;
    }

    if (event.eventType === 'StepStarted' && !terminalSteps.has(event.stepId)) {
      return event.stepId;
    }
  }

  return undefined;
}

function deriveFailedStepId(
  status: CanonicalRunStatus['status'],
  workflowSnapshot: WorkflowSnapshot | null,
  events: ReadonlyArray<EventEnvelope>,
  snapshotExecution: CanonicalRunStatus['execution']
): string | undefined {
  if (status !== 'FAILED') {
    return undefined;
  }

  const fromExecution = readNonBlankString(snapshotExecution?.failure?.stepId);
  if (fromExecution !== undefined) {
    return fromExecution;
  }

  const fromSnapshot = deriveFailedStepFromSnapshot(workflowSnapshot);
  if (fromSnapshot !== undefined) {
    return fromSnapshot;
  }

  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index]!;
    if (event.eventType === 'StepFailed' && typeof event.stepId === 'string') {
      return event.stepId;
    }
  }

  return undefined;
}

function deriveErrorReason(
  events: ReadonlyArray<EventEnvelope>,
  snapshotExecution: CanonicalRunStatus['execution']
): string | undefined {
  const failure = snapshotExecution?.failure;
  if (failure) {
    const reason = readNonBlankString(failure.reason);
    if (reason !== undefined) {
      return reason;
    }

    const message = readNonBlankString(failure.message);
    if (message !== undefined) {
      return message;
    }
  }

  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index]!;
    if (event.eventType !== 'StepFailed' || !isRecord(event.payload)) {
      continue;
    }

    const reason = readNonBlankString(event.payload['reason']);
    if (reason !== undefined) {
      return reason;
    }

    const message = readNonBlankString(event.payload['message']);
    if (message !== undefined) {
      return message;
    }
  }

  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index]!;
    if (event.eventType !== 'RunFailed' || !isRecord(event.payload)) {
      continue;
    }

    const reason = readNonBlankString(event.payload['reason']);
    if (reason !== undefined) {
      return reason;
    }

    const message = readNonBlankString(event.payload['message']);
    if (message !== undefined) {
      return message;
    }
  }

  return undefined;
}

function deriveMaterialization(
  status: CanonicalRunStatus['status'],
  events: ReadonlyArray<EventEnvelope>,
  snapshotExecution: CanonicalRunStatus['execution']
) {
  if (status !== 'COMPLETED') {
    return undefined;
  }

  if (snapshotExecution?.materialization) {
    return snapshotExecution.materialization;
  }

  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index]!;
    if (!isRecord(event.payload)) {
      continue;
    }

    const resultEvidence = parseMaterialization(event.payload['resultEvidence']);
    if (resultEvidence !== undefined) {
      return resultEvidence;
    }
  }

  return undefined;
}

function deriveDiagnostics(args: {
  snapshot: Pick<
    CanonicalRunStatus,
    'runId' | 'status' | 'execution' | 'startedAt' | 'completedAt'
  >;
  currentAttemptEvents: ReadonlyArray<EventEnvelope>;
  planId?: string;
  planRecord?: PlanRecord;
  runtimeAdapter?: string;
  executor?: TransformationExecutor;
  currentStepId?: string;
  failedStepId?: string;
  errorReason?: string;
  materialization?: MaterializationEvidence;
}): RunReadEvidenceModel['diagnostics'] {
  const runId = readNonBlankString(args.snapshot.runId);
  if (runId === undefined) {
    return undefined;
  }

  const planId =
    readNonBlankString(args.planId) ??
    readNonBlankString(args.planRecord?.planId) ??
    deriveLatestEventString(args.currentAttemptEvents, 'planId');
  const planSha = readNonBlankString(args.planRecord?.canonicalHash);
  const stepId =
    args.failedStepId ??
    args.currentStepId ??
    readNonBlankString(args.snapshot.execution?.failure?.stepId) ??
    readNonBlankString(args.snapshot.execution?.activeStepId) ??
    deriveLatestStepId(args.currentAttemptEvents);
  const attemptId = deriveLatestLogicalAttemptId(args.currentAttemptEvents)?.toString();
  const adapter = readNonBlankString(args.runtimeAdapter) ?? args.executor;
  const durationMs =
    deriveDurationMs(args.snapshot.startedAt, args.snapshot.completedAt) ??
    args.materialization?.durationMs;
  const errorCode = args.snapshot.status === 'FAILED' ? args.errorReason : undefined;
  const pointerFields = {
    runId,
    planId,
    planSha,
    stepId,
    attemptId,
    adapter,
    status: args.snapshot.status,
  };

  return {
    runId,
    ...(planId === undefined ? {} : { planId }),
    ...(planSha === undefined ? {} : { planSha }),
    ...(stepId === undefined ? {} : { stepId }),
    ...(attemptId === undefined ? {} : { attemptId }),
    ...(adapter === undefined ? {} : { adapter }),
    ...(durationMs === undefined ? {} : { durationMs }),
    status: args.snapshot.status,
    ...(errorCode === undefined ? {} : { errorCode }),
    pointers: [
      {
        kind: 'trace',
        label: 'Trace query',
        value: formatDiagnosticPointer('trace', pointerFields),
      },
      {
        kind: 'log',
        label: 'Log query',
        value: formatDiagnosticPointer('logs', pointerFields),
      },
    ],
  };
}

function selectLatestLogicalAttemptEvents(
  events: ReadonlyArray<EventEnvelope>
): ReadonlyArray<EventEnvelope> {
  const latestLogicalAttemptId = deriveLatestLogicalAttemptId(events);
  if (latestLogicalAttemptId === undefined) {
    return events;
  }

  return events.filter((event) => event.logicalAttemptId === latestLogicalAttemptId);
}

function deriveLatestLogicalAttemptId(events: ReadonlyArray<EventEnvelope>): number | undefined {
  let latestLogicalAttemptId: number | undefined;

  for (const event of events) {
    const logicalAttemptId = event.logicalAttemptId;
    if (!Number.isInteger(logicalAttemptId) || logicalAttemptId <= 0) {
      continue;
    }

    if (latestLogicalAttemptId === undefined || logicalAttemptId > latestLogicalAttemptId) {
      latestLogicalAttemptId = logicalAttemptId;
    }
  }

  return latestLogicalAttemptId;
}

function deriveLatestStepId(events: ReadonlyArray<EventEnvelope>): string | undefined {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const stepId = readNonBlankString(events[index]?.stepId);
    if (stepId !== undefined) {
      return stepId;
    }
  }

  return undefined;
}

function deriveLatestEventString(
  events: ReadonlyArray<EventEnvelope>,
  field: keyof EventEnvelope
): string | undefined {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const value = readNonBlankString(events[index]?.[field]);
    if (value !== undefined) {
      return value;
    }
  }

  return undefined;
}

function deriveDurationMs(startedAt: string | undefined, completedAt: string | undefined) {
  const startedEpoch = startedAt ? Date.parse(startedAt) : NaN;
  const completedEpoch = completedAt ? Date.parse(completedAt) : NaN;
  if (!Number.isFinite(startedEpoch) || !Number.isFinite(completedEpoch)) {
    return undefined;
  }

  const durationMs = completedEpoch - startedEpoch;
  return durationMs >= 0 ? durationMs : undefined;
}

function formatDiagnosticPointer(
  prefix: 'trace' | 'logs',
  fields: Readonly<Record<string, string | undefined>>
): string {
  const pairs = Object.entries(fields)
    .filter((entry): entry is [string, string] => entry[1] !== undefined)
    .map(([key, value]) => `${key}=${value}`);
  return `${prefix} ${pairs.join(' ')}`;
}

function deriveRunningStepFromSnapshot(
  workflowSnapshot: WorkflowSnapshot | null
): string | undefined {
  if (!workflowSnapshot) {
    return undefined;
  }

  let candidateStepId: string | undefined;
  let candidateStartedAt = '';

  for (const [stepId, step] of Object.entries(workflowSnapshot.steps)) {
    if (step.status !== 'RUNNING') {
      continue;
    }

    const startedAt = step.startedAt ?? '';
    if (candidateStepId === undefined || startedAt > candidateStartedAt) {
      candidateStepId = stepId;
      candidateStartedAt = startedAt;
    }
  }

  return candidateStepId;
}

function deriveFailedStepFromSnapshot(
  workflowSnapshot: WorkflowSnapshot | null
): string | undefined {
  if (!workflowSnapshot) {
    return undefined;
  }

  let candidateStepId: string | undefined;
  let candidateCompletedAt = '';

  for (const [stepId, step] of Object.entries(workflowSnapshot.steps)) {
    if (step.status !== 'FAILED') {
      continue;
    }

    const completedAt = step.completedAt ?? '';
    if (candidateStepId === undefined || completedAt > candidateCompletedAt) {
      candidateStepId = stepId;
      candidateCompletedAt = completedAt;
    }
  }

  return candidateStepId;
}

function parseExecutor(value: unknown): TransformationExecutor | undefined {
  const parsed = TransformationExecutorSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

function parseMaterialization(value: unknown) {
  const parsed = MaterializationEvidenceSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

function readPlanObservabilityExtra(planRecord?: PlanRecord): Record<string, unknown> | undefined {
  if (!planRecord) {
    return undefined;
  }

  try {
    const plan = parseExecutionPlan(JSON.parse(planRecord.canonicalPlanJson));
    return isRecord(plan.observability?.extra) ? plan.observability.extra : undefined;
  } catch {
    return undefined;
  }
}

function deriveProvenance(
  planRecord: PlanRecord | undefined,
  planExtra: Record<string, unknown> | undefined
): RunReadEvidenceModel['provenance'] | undefined {
  if (!planRecord) {
    return undefined;
  }

  const provenance = planExtra?.['planPreviewProvenance'];
  const provenanceRecord = isRecord(provenance) ? provenance : undefined;
  const graphArtifact = parseGitArtifactRef(provenanceRecord?.['graphArtifact']);
  const sqlArtifact = parseGitArtifactRef(provenanceRecord?.['sqlArtifact']);

  return {
    persistedPlan: {
      planRecordId: planRecord.planId,
      planVersion: planRecord.planVersion,
      sourceRef: planRecord.sourceRef,
      canonicalPlanSha256: planRecord.canonicalHash,
    },
    ...(graphArtifact || sqlArtifact
      ? {
          authoring: {
            ...(graphArtifact === undefined ? {} : { graphArtifact }),
            ...(sqlArtifact === undefined ? {} : { sqlArtifact }),
          },
        }
      : {}),
  };
}

function parseGitArtifactRef(value: unknown): RunGitArtifactRef | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const repo = readNonBlankString(value['repo']);
  const path = readNonBlankString(value['path']);
  if (repo === undefined || path === undefined) {
    return undefined;
  }

  const ref = readNonBlankString(value['ref']);
  const commitSha = readNonBlankString(value['commitSha']);
  const contentSha256 = readNonBlankString(value['contentSha256']);

  return {
    repo,
    path,
    ...(ref === undefined ? {} : { ref }),
    ...(commitSha === undefined ? {} : { commitSha }),
    ...(contentSha256 === undefined ? {} : { contentSha256 }),
  };
}

function readNonBlankString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
