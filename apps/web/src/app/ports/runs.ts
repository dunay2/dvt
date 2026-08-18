/**
 * Owned concern: define the presentation-facing runs port and DTO vocabulary
 * consumed by views without exposing runtime-owned execution internals.
 */
import type {
  CancelRunReceipt,
  ExecutionSelection,
  RecoverRunReceipt,
  RunControlAvailability,
  RunControlUnavailableReason,
  SourceDataSampleResponse,
} from '@dvt/contracts';
import type { PlanRef, RunEvent } from '../types/engine';
import type { WorkspaceScope } from './sessionContext';

export type { SourceDataSampleResponse };

// ---------------------------------------------------------------------------
// Presentation-facing DTOs for the runs domain
// ---------------------------------------------------------------------------

export type StartRunInput = {
  planRef: PlanRef;
  workspaceScope: WorkspaceScope;
  selection: ExecutionSelection;
};

export type RunStartReceipt = {
  runId: string;
  accepted: boolean;
  duplicate?: boolean;
  duplicateOf?: string;
};

export type UiRunStatus = 'unknown' | 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type RunExecutor = 'postgres' | 'dbt';

export type { RunControlUnavailableReason } from '@dvt/contracts';

export type RunControlActionAvailability =
  | { readonly available: true }
  | { readonly available: false; readonly reason: RunControlUnavailableReason };

export type { RunControlAvailability } from '@dvt/contracts';

export type { CancelRunReceipt, RecoverRunReceipt } from '@dvt/contracts';

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

export type RunPlanExecutionSummary = {
  executor: RunExecutor;
  nodeCount: number;
  stepCount: number;
  sourceTables: readonly string[];
  sinkTables: readonly string[];
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

export type RunDiagnosticPointer = {
  kind: 'trace' | 'log';
  label: string;
  value: string;
};

export type RunDiagnostics = {
  runId: string;
  planId?: string;
  planSha?: string;
  stepId?: string;
  attemptId?: string;
  adapter?: string;
  durationMs?: number;
  status: UiRunStatus;
  errorCode?: string;
  pointers: readonly RunDiagnosticPointer[];
};

/**
 * Common fields shared between {@link RunSnapshot} and {@link RunSummaryItem},
 * keeping the snapshot DTO and its summary projection aligned without
 * duplicating field declarations.
 */
export type RunCommonSnapshotFields = {
  tenantId?: string;
  projectId?: string;
  runId: string;
  planId?: string;
  planVersion?: string;
  logicalAttemptId?: number;
  provider?: string;
  status: UiRunStatus;
  environment?: string;
  gitSha?: string;
  createdAt?: string;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  substatus?: string;
  message?: string;
  hash?: string;
  snapshotStaleness?: 'FRESH' | 'STALE' | 'UNKNOWN';
  execution?: RunExecutionEvidence;
  currentStepId?: string;
  failedStepId?: string;
  errorReason?: string;
  controls?: RunControlAvailability;
};

/** Summary projection: exactly the common snapshot fields. */
export type RunSummaryItem = RunCommonSnapshotFields;

/** Full snapshot DTO with run-detail-specific fields. */
export type RunSnapshot = RunCommonSnapshotFields & {
  executor?: RunExecutor;
  materialization?: MaterializationEvidence;
  provenance?: RunProvenanceChain;
  planSummary?: RunPlanExecutionSummary;
  diagnostics?: RunDiagnostics;
};

export type RunEventTimelinePage = {
  events: RunEvent[];
  nextAfterSeq?: number;
};

// ---------------------------------------------------------------------------
// Runs port: presentation-layer contract for run operations
// ---------------------------------------------------------------------------

/**
 * Port interface for run operations consumed by the presentation layer.
 *
 * The product composition root wires the API adapter. Tests may satisfy this
 * contract with explicit doubles injected at the AppServices boundary.
 */
export interface IRunsPort {
  listRunSummaries: () => Promise<RunSummaryItem[]>;
  getRunSnapshot: (runId: string) => Promise<RunSnapshot | null>;
  getRunMaterializationSample?: (runId: string, limit: number) => Promise<SourceDataSampleResponse>;
  startRun: (input: StartRunInput) => Promise<RunStartReceipt>;
  cancelRun: (runId: string) => Promise<CancelRunReceipt>;
  recoverRun: (runId: string) => Promise<RecoverRunReceipt>;
  listRunEvents: (runId: string, afterSeq?: number) => Promise<RunEventTimelinePage>;
}
