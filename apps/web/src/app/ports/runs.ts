/**
 * Owned concern: define the presentation-facing runs port and DTO vocabulary
 * consumed by views without exposing runtime-owned execution internals.
 */
import type { EngineRunRef, PlanRef, RunEvent } from '../types/engine';
import type { WorkspaceScope } from './sessionContext';

// ---------------------------------------------------------------------------
// Presentation-facing DTOs for the runs domain
// ---------------------------------------------------------------------------

export type StartRunInput = {
  planRef: PlanRef;
  workspaceScope: WorkspaceScope;
  selection: readonly string[];
};

export type UiRunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type RunExecutor = 'postgres' | 'dbt';

export type MaterializationEvidence = {
  executor: RunExecutor;
  environmentId: string;
  sinkTable: string;
  rowsWritten: number;
  startedAt: string;
  completedAt: string;
  durationMs: number;
};

export type RunFailureEvidence = {
  stepId: string;
  reason?: string;
  message?: string;
  failedAt: string;
};

export type RunExecutionEvidence = {
  activeStepId?: string;
  failure?: RunFailureEvidence;
  materialization?: MaterializationEvidence;
};

export type RunGitArtifactRef = {
  repo: string;
  path: string;
  ref?: string;
  commitSha?: string;
  contentSha256?: string;
};

export type RunPersistedPlanProvenance = {
  planRecordId: string;
  planVersion: string;
  sourceRef: string;
  canonicalPlanSha256: string;
};

export type RunAuthoringProvenance = {
  graphArtifact?: RunGitArtifactRef;
  sqlArtifact?: RunGitArtifactRef;
};

export type RunProvenanceChain = {
  persistedPlan: RunPersistedPlanProvenance;
  authoring?: RunAuthoringProvenance;
};

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
  hash?: string;
  snapshotStaleness?: 'FRESH' | 'STALE' | 'UNKNOWN';
  execution?: RunExecutionEvidence;
};

export type RunSnapshot = {
  runId: string;
  planId?: string;
  status: UiRunStatus;
  executor?: RunExecutor;
  environment?: string;
  gitSha?: string;
  startedAt: string;
  completedAt?: string;
  substatus?: string;
  message?: string;
  hash?: string;
  snapshotStaleness?: 'FRESH' | 'STALE' | 'UNKNOWN';
  currentStepId?: string;
  failedStepId?: string;
  errorReason?: string;
  materialization?: MaterializationEvidence;
  provenance?: RunProvenanceChain;
  execution?: RunExecutionEvidence;
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
