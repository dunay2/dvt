import type { EventEnvelope, IRunStateStoreRead, RunMetadata } from '@dvt/engine';

import type {
  AuthorizedQueryExecutionContext,
  CostAttributionRunDto,
  CostAttributionStepDto,
  GetCostAttributionSummaryQuery,
  GetCostAttributionSummaryResult,
  IGetCostAttributionSummaryUseCase,
} from '../ports/runtime.js';

type AttributableStepEvent = EventEnvelope & {
  readonly eventType: 'StepCompleted' | 'StepFailed';
  readonly stepId: string;
};

export class GetCostAttributionSummaryUseCase implements IGetCostAttributionSummaryUseCase {
  public constructor(private readonly stateStore: IRunStateStoreRead) {}

  public async execute(
    query: GetCostAttributionSummaryQuery,
    context: AuthorizedQueryExecutionContext
  ): Promise<GetCostAttributionSummaryResult> {
    const tenantId = context.scope.tenantId.value;
    const metadata = await this.stateStore.listRuns({ tenantId, limit: query.limit });
    const scopedMetadata = metadata.filter((item) => isInAuthorizedScope(item, context));
    const runRows: CostAttributionRunDto[] = [];
    const stepRows: CostAttributionStepDto[] = [];
    let completedStepCount = 0;
    let failedStepCount = 0;
    let totalStepDurationMs = 0;
    let firstEventAt: string | null = null;
    let lastEventAt: string | null = null;

    for (const item of scopedMetadata) {
      const [snapshot, events] = await Promise.all([
        this.stateStore.getSnapshot(item.tenantId, item.runId),
        this.stateStore.listEvents(item.tenantId, item.runId),
      ]);
      const runSteps = events.filter(isAttributableStepEvent).map((event) => {
        const durationMs = readDurationMs(event.payload);
        if (event.eventType === 'StepCompleted') completedStepCount += 1;
        if (event.eventType === 'StepFailed') failedStepCount += 1;
        totalStepDurationMs += durationMs;
        firstEventAt = earlierIso(firstEventAt, event.emittedAt);
        lastEventAt = laterIso(lastEventAt, event.emittedAt);
        return {
          runId: event.runId,
          stepId: event.stepId,
          eventType: event.eventType,
          durationMs,
          costAmount: null,
          currency: null,
        } satisfies CostAttributionStepDto;
      });

      stepRows.push(...runSteps);
      runRows.push({
        runId: item.runId,
        projectId: item.projectId,
        environmentId: item.environmentId,
        planId: item.planId,
        planVersion: item.planVersion,
        status: snapshot?.status ?? null,
        completedStepCount: runSteps.filter((event) => event.eventType === 'StepCompleted').length,
        failedStepCount: runSteps.filter((event) => event.eventType === 'StepFailed').length,
        totalStepDurationMs: sumDurations(runSteps),
        costAmount: null,
        currency: null,
      });
    }

    return {
      tenantId,
      projectId: context.scope.projectId?.value ?? null,
      environmentId: context.scope.environmentId?.value ?? null,
      runCount: scopedMetadata.length,
      completedStepCount,
      failedStepCount,
      totalStepDurationMs,
      totalCostAmount: null,
      currency: null,
      costCaptureStatus: 'unavailable',
      observedWindow: { firstEventAt, lastEventAt },
      runs: runRows,
      steps: stepRows,
      nextCursor:
        scopedMetadata.length === query.limit ? (scopedMetadata.at(-1)?.runId ?? null) : null,
    };
  }
}

function isInAuthorizedScope(item: RunMetadata, context: AuthorizedQueryExecutionContext): boolean {
  if (context.scope.projectId && item.projectId !== context.scope.projectId.value) return false;
  if (context.scope.environmentId && item.environmentId !== context.scope.environmentId.value) {
    return false;
  }
  return true;
}

function isAttributableStepEvent(event: EventEnvelope): event is AttributableStepEvent {
  return (
    (event.eventType === 'StepCompleted' || event.eventType === 'StepFailed') &&
    typeof event.stepId === 'string' &&
    event.stepId.length > 0
  );
}

function readDurationMs(payload: Record<string, unknown> | undefined): number {
  const directDuration = payload?.durationMs;
  if (
    typeof directDuration === 'number' &&
    Number.isFinite(directDuration) &&
    directDuration >= 0
  ) {
    return directDuration;
  }
  const resultEvidence = payload?.resultEvidence;
  if (isRecord(resultEvidence)) {
    const evidenceDuration = resultEvidence.durationMs;
    if (
      typeof evidenceDuration === 'number' &&
      Number.isFinite(evidenceDuration) &&
      evidenceDuration >= 0
    ) {
      return evidenceDuration;
    }
  }
  return 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function earlierIso(current: string | null, candidate: string): string {
  return current === null || candidate < current ? candidate : current;
}

function laterIso(current: string | null, candidate: string): string {
  return current === null || candidate > current ? candidate : current;
}

function sumDurations(steps: ReadonlyArray<CostAttributionStepDto>): number {
  return steps.reduce((total, step) => total + step.durationMs, 0);
}
