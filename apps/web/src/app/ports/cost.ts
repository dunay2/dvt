/** Owned concern: define web-facing cost attribution read-model DTOs and query port. */

export type CostCaptureStatus = 'unavailable';

export type CostAttributionSummaryQuery = Readonly<{
  tenantId: string;
  projectId?: string;
  environmentId?: string;
  limit?: number;
}>;

export type CostAttributionObservedWindow = Readonly<{
  firstEventAt: string | null;
  lastEventAt: string | null;
}>;

export type CostAttributionRun = Readonly<{
  runId: string;
  projectId: string;
  environmentId: string;
  planId: string;
  planVersion: string;
  status: string | null;
  completedStepCount: number;
  failedStepCount: number;
  totalStepDurationMs: number;
  costAmount: null;
  currency: null;
}>;

export type CostAttributionStep = Readonly<{
  runId: string;
  stepId: string;
  eventType: 'StepCompleted' | 'StepFailed';
  durationMs: number;
  costAmount: null;
  currency: null;
}>;

export type CostAttributionSummary = Readonly<{
  tenantId: string;
  projectId: string | null;
  environmentId: string | null;
  runCount: number;
  completedStepCount: number;
  failedStepCount: number;
  totalStepDurationMs: number;
  totalCostAmount: null;
  currency: null;
  costCaptureStatus: CostCaptureStatus;
  observedWindow: CostAttributionObservedWindow;
  runs: readonly CostAttributionRun[];
  steps: readonly CostAttributionStep[];
  nextCursor: string | null;
}>;

export interface ICostAttributionSummaryPort {
  getCostAttributionSummary(
    query: CostAttributionSummaryQuery
  ): Promise<CostAttributionSummary>;
}
