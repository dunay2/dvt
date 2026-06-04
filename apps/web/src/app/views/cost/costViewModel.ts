import type { CostAttributionSummary, CostAttributionStep } from '../../ports/cost';

export type CostDriver = {
  readonly id: string;
  readonly name: string;
  readonly runId: string;
  readonly eventType: CostAttributionStep['eventType'];
  readonly durationMs: number;
  readonly duration: number;
  readonly status: 'success' | 'failed';
};

export type CostAlert = {
  readonly id: string;
  readonly title: string;
  readonly description: string;
};

export type RuntimeDurationPoint = Readonly<{
  readonly name: string;
  readonly duration: number;
}>;

export type CostViewModel = {
  readonly costCaptureStatus: 'unavailable';
  readonly monetaryCaptureAvailable: false;
  readonly totalCostLabel: string;
  readonly runCount: number;
  readonly completedStepCount: number;
  readonly failedStepCount: number;
  readonly stepsWithUsageCount: number;
  readonly totalDurationMs: number;
  readonly totalDurationSeconds: number;
  readonly observedWindowLabel: string;
  readonly costAlerts: CostAlert[];
  readonly costByModel: CostDriver[];
  readonly durationByRun: readonly RuntimeDurationPoint[];
  readonly durationByStep: readonly RuntimeDurationPoint[];
};

const UNAVAILABLE_MONEY_LABEL = 'Unavailable';
const NO_OBSERVED_WINDOW_LABEL = 'No runtime events observed';

function toSeconds(durationMs: number): number {
  return Number((durationMs / 1000).toFixed(1));
}

export function formatDurationMs(durationMs: number): string {
  return toSeconds(durationMs).toFixed(1) + 's';
}

export function formatMoneyAmount(value: number | null, currency: string | null): string {
  if (value === null || currency === null) {
    return UNAVAILABLE_MONEY_LABEL;
  }

  return currency + ' ' + value.toFixed(2);
}

function formatObservedWindow(summary: CostAttributionSummary | null): string {
  const firstEventAt = summary?.observedWindow.firstEventAt;
  const lastEventAt = summary?.observedWindow.lastEventAt;
  if (firstEventAt === null || firstEventAt === undefined) {
    return NO_OBSERVED_WINDOW_LABEL;
  }
  if (lastEventAt === null || lastEventAt === undefined || lastEventAt === firstEventAt) {
    return firstEventAt;
  }
  return firstEventAt + ' -> ' + lastEventAt;
}

function createEmptyCostViewModel(): CostViewModel {
  return {
    costCaptureStatus: 'unavailable',
    monetaryCaptureAvailable: false,
    totalCostLabel: UNAVAILABLE_MONEY_LABEL,
    runCount: 0,
    completedStepCount: 0,
    failedStepCount: 0,
    stepsWithUsageCount: 0,
    totalDurationMs: 0,
    totalDurationSeconds: 0,
    observedWindowLabel: NO_OBSERVED_WINDOW_LABEL,
    costAlerts: [],
    costByModel: [],
    durationByRun: [],
    durationByStep: [],
  };
}

function buildCostDrivers(steps: readonly CostAttributionStep[]): CostDriver[] {
  return steps
    .map((step, sourceIndex) => ({ sourceIndex, step }))
    .sort(
      (left, right) =>
        right.step.durationMs - left.step.durationMs ||
        left.step.stepId.localeCompare(right.step.stepId) ||
        left.step.eventType.localeCompare(right.step.eventType) ||
        left.sourceIndex - right.sourceIndex
    )
    .map(({ sourceIndex, step }) => {
      const status = step.eventType === 'StepFailed' ? 'failed' : 'success';
      return {
        id: [step.runId, step.stepId, step.eventType, sourceIndex].join(':'),
        name: step.stepId,
        runId: step.runId,
        eventType: step.eventType,
        durationMs: step.durationMs,
        duration: toSeconds(step.durationMs),
        status,
      };
    });
}

function buildCostAlerts(steps: readonly CostAttributionStep[]): CostAlert[] {
  return steps
    .map((step, sourceIndex) => ({ sourceIndex, step }))
    .filter(({ step }) => step.eventType === 'StepFailed')
    .map(({ sourceIndex, step }) => ({
      id: [step.runId, step.stepId, step.eventType, sourceIndex].join(':'),
      title: step.stepId + ' failed during runtime attribution',
      description:
        'Run ' +
        step.runId +
        ' recorded a failed step after ' +
        formatDurationMs(step.durationMs) +
        '. Monetary attribution is unavailable until provider credit capture exists.',
    }));
}

export function buildCostViewModel(summary: CostAttributionSummary | null): CostViewModel {
  if (summary === null) {
    return createEmptyCostViewModel();
  }

  const costByModel = buildCostDrivers(summary.steps);
  const durationByRun = summary.runs.map((run) => ({
    name: run.runId,
    duration: toSeconds(run.totalStepDurationMs),
  }));
  const durationByStep = costByModel.map((driver) => ({
    name: driver.name,
    duration: driver.duration,
  }));

  return {
    costCaptureStatus: summary.costCaptureStatus,
    monetaryCaptureAvailable: false,
    totalCostLabel: formatMoneyAmount(summary.totalCostAmount, summary.currency),
    runCount: summary.runCount,
    completedStepCount: summary.completedStepCount,
    failedStepCount: summary.failedStepCount,
    stepsWithUsageCount: summary.steps.length,
    totalDurationMs: summary.totalStepDurationMs,
    totalDurationSeconds: toSeconds(summary.totalStepDurationMs),
    observedWindowLabel: formatObservedWindow(summary),
    costAlerts: buildCostAlerts(summary.steps),
    costByModel,
    durationByRun,
    durationByStep,
  };
}
