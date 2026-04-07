import type { EngineRunRef, PlanRef, RunContext, RunEvent } from '../types/engine';

// ---------------------------------------------------------------------------
// Presentation-facing DTOs for the runs domain
// ---------------------------------------------------------------------------

export type StartRunInput = {
  planRef: PlanRef;
  context: RunContext;
};

export type UiRunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export type RunSummaryItem = {
  runId: string;
  planId?: string;
  status: UiRunStatus;
  environment?: string;
  gitSha?: string;
  startedAt: string;
  completedAt?: string;
  substatus?: string;
  message?: string;
  snapshotStaleness?: 'FRESH' | 'STALE' | 'UNKNOWN';
};

export type RunSnapshot = {
  runId: string;
  planId?: string;
  status: UiRunStatus;
  environment?: string;
  gitSha?: string;
  startedAt: string;
  completedAt?: string;
  substatus?: string;
  message?: string;
  snapshotStaleness?: 'FRESH' | 'STALE' | 'UNKNOWN';
};

export type RunEventTimelinePage = {
  events: RunEvent[];
  nextAfterSeq?: number;
};

// ---------------------------------------------------------------------------
// Runs port — presentation-layer contract for run operations
// ---------------------------------------------------------------------------

/**
 * Port interface for run operations consumed by the presentation layer.
 *
 * Implementations (mock, API) satisfy this contract through adapters wired
 * in the composition root. Views and hooks depend only on this interface.
 */
export interface IRunsPort {
  listRunSummaries: () => Promise<RunSummaryItem[]>;
  getRunSnapshot: (runId: string) => Promise<RunSnapshot | null>;
  startRun: (input: StartRunInput) => Promise<EngineRunRef>;
  listRunEvents: (runId: string, afterSeq?: number) => Promise<RunEventTimelinePage>;
}
