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

export interface RunReadEvidenceModel {
  readonly executor?: TransformationExecutor;
  readonly currentStepId?: string;
  readonly failedStepId?: string;
  readonly errorReason?: string;
  readonly materialization?: {
    executor: MaterializationEvidence['executor'];
    environmentId: MaterializationEvidence['environmentId'];
    sinkTable: MaterializationEvidence['sinkTable'];
    rowsWritten: number;
    startedAt: MaterializationEvidence['startedAt'];
    completedAt: MaterializationEvidence['completedAt'];
    durationMs: number;
  };
}

export function deriveRunReadEvidenceModel(args: {
  snapshot: Pick<CanonicalRunStatus, 'status' | 'execution'>;
  workflowSnapshot: WorkflowSnapshot | null;
  events?: ReadonlyArray<EventEnvelope>;
  planRecord?: PlanRecord;
}): RunReadEvidenceModel {
  const currentAttemptEvents = selectLatestLogicalAttemptEvents(args.events ?? []);
  const executor = deriveExecutor(currentAttemptEvents, args.snapshot.execution, args.planRecord);
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
  const materialization = deriveMaterialization(
    args.snapshot.status,
    currentAttemptEvents,
    args.snapshot.execution
  );

  return {
    ...(executor === undefined ? {} : { executor }),
    ...(currentStepId === undefined ? {} : { currentStepId }),
    ...(failedStepId === undefined ? {} : { failedStepId }),
    ...(errorReason === undefined ? {} : { errorReason }),
    ...(materialization === undefined ? {} : { materialization }),
  };
}

function deriveExecutor(
  events: ReadonlyArray<EventEnvelope>,
  snapshotExecution: CanonicalRunStatus['execution'],
  planRecord?: PlanRecord
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

  if (!planRecord) {
    return undefined;
  }

  try {
    const plan = parseExecutionPlan(JSON.parse(planRecord.canonicalPlanJson));
    const extra = plan.observability?.extra;
    if (!isRecord(extra)) {
      return undefined;
    }
    const runtimeBinding = extra['transformationFlowRuntime'];
    if (!isRecord(runtimeBinding)) {
      return undefined;
    }
    return parseExecutor(runtimeBinding['executor']);
  } catch {
    return undefined;
  }
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

    const legacyMaterialization = parseMaterialization(event.payload['materialization']);
    if (legacyMaterialization !== undefined) {
      return legacyMaterialization;
    }
  }

  return undefined;
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

function readNonBlankString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
