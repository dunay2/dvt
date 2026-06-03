/**
 * Owned concern: define API application runtime DTOs and ports without
 * re-declaring provider ids outside the shared contract vocabulary.
 */
import type {
  CanonicalRunStatus,
  EventEnvelope,
  Provider,
  MaterializationEvidence,
  ProviderRunStatusView,
  RunExecutionContextRef,
  TransformationExecutor,
  TransformationSqlFirstPlanSummary,
} from '@dvt/contracts';

import type { QueryAuthorizationAction } from './accessDecision.js';
import type { AuthorizedCommandExecutionContext, AuthorizedExecutionContext } from './auth.js';

export type AuthorizedQueryExecutionContext = AuthorizedExecutionContext<QueryAuthorizationAction>;

export type SupportedSignalType = 'PAUSE' | 'RESUME' | 'CANCEL';

export interface GetRunStatusQuery {
  readonly runId: string;
  readonly enriched: boolean;
}

export type RunSnapshotStaleness = 'FRESH' | 'STALE' | 'UNKNOWN';

export interface IRunSnapshotStalenessReader {
  isSnapshotStale(tenantId: string, runId: string): Promise<boolean | null>;
}

export type SnapshotStalenessFallbackReason = 'query_not_wired' | 'query_failed';

export interface IRunStatusStalenessTelemetry {
  recordSnapshotStalenessResult(
    result: RunSnapshotStaleness,
    tenantId: string,
    runId: string
  ): void;
  recordSnapshotStalenessFallback(
    reason: SnapshotStalenessFallbackReason,
    tenantId: string,
    runId: string
  ): void;
}

export interface RunGitArtifactRef {
  readonly repo: string;
  readonly path: string;
  readonly ref?: string;
  readonly commitSha?: string;
  readonly contentSha256?: string;
}

export interface RunPersistedPlanProvenance {
  readonly planRecordId: string;
  readonly planVersion: string;
  readonly sourceRef: string;
  readonly canonicalPlanSha256: string;
}

export interface RunAuthoringProvenance {
  readonly graphArtifact?: RunGitArtifactRef;
  readonly sqlArtifact?: RunGitArtifactRef;
}

export interface RunProvenanceChain {
  readonly persistedPlan: RunPersistedPlanProvenance;
  readonly authoring?: RunAuthoringProvenance;
}

export interface RunDiagnosticPointer {
  readonly kind: 'trace' | 'log';
  readonly label: string;
  readonly value: string;
}

export interface RunDiagnostics {
  readonly runId: string;
  readonly planId?: string;
  readonly planSha?: string;
  readonly stepId?: string;
  readonly attemptId?: string;
  readonly adapter?: string;
  readonly durationMs?: number;
  readonly status: CanonicalRunStatus['status'];
  readonly errorCode?: string;
  readonly pointers: ReadonlyArray<RunDiagnosticPointer>;
}

export type GetRunStatusResult = Pick<
  CanonicalRunStatus,
  'runId' | 'status' | 'substatus' | 'message' | 'startedAt' | 'completedAt' | 'execution'
> & {
  readonly tenantId: string;
  readonly enriched: boolean;
  readonly providerView?: ProviderRunStatusView;
  readonly snapshotStaleness: RunSnapshotStaleness;
  readonly executor?: TransformationExecutor;
  readonly currentStepId?: string;
  readonly failedStepId?: string;
  readonly errorReason?: string;
  readonly materialization?: MaterializationEvidence;
  readonly provenance?: RunProvenanceChain;
  readonly planSummary?: TransformationSqlFirstPlanSummary;
  readonly diagnostics?: RunDiagnostics;
};

export interface IGetRunStatusUseCase {
  execute(
    query: GetRunStatusQuery,
    context: AuthorizedQueryExecutionContext
  ): Promise<GetRunStatusResult>;
}

export interface ListRunsQuery {
  readonly limit: number;
}

export interface RunListItemDto {
  readonly tenantId: string;
  readonly projectId: string;
  readonly environmentId: string;
  readonly runId: string;
  readonly planId: string;
  readonly planVersion: string;
  readonly logicalAttemptId: number;
  readonly provider: Provider;
  readonly createdAt?: string;
  readonly status?: CanonicalRunStatus['status'];
}

export interface ListRunsResult {
  readonly items: ReadonlyArray<RunListItemDto>;
  readonly nextCursor: string | null;
}

export interface IListRunsUseCase {
  execute(query: ListRunsQuery, context: AuthorizedQueryExecutionContext): Promise<ListRunsResult>;
}

export interface GetCostAttributionSummaryQuery {
  readonly limit: number;
}

export interface CostAttributionObservedWindowDto {
  readonly firstEventAt: string | null;
  readonly lastEventAt: string | null;
}

export interface CostAttributionRunDto {
  readonly runId: string;
  readonly projectId: string;
  readonly environmentId: string;
  readonly planId: string;
  readonly planVersion: string;
  readonly status: CanonicalRunStatus['status'] | null;
  readonly completedStepCount: number;
  readonly failedStepCount: number;
  readonly totalStepDurationMs: number;
  readonly costAmount: null;
  readonly currency: null;
}

export interface CostAttributionStepDto {
  readonly runId: string;
  readonly stepId: string;
  readonly eventType: 'StepCompleted' | 'StepFailed';
  readonly durationMs: number;
  readonly costAmount: null;
  readonly currency: null;
}

export interface GetCostAttributionSummaryResult {
  readonly tenantId: string;
  readonly projectId: string | null;
  readonly environmentId: string | null;
  readonly runCount: number;
  readonly completedStepCount: number;
  readonly failedStepCount: number;
  readonly totalStepDurationMs: number;
  readonly totalCostAmount: null;
  readonly currency: null;
  readonly costCaptureStatus: 'unavailable';
  readonly observedWindow: CostAttributionObservedWindowDto;
  readonly runs: ReadonlyArray<CostAttributionRunDto>;
  readonly steps: ReadonlyArray<CostAttributionStepDto>;
  readonly nextCursor: string | null;
}

export interface IGetCostAttributionSummaryUseCase {
  execute(
    query: GetCostAttributionSummaryQuery,
    context: AuthorizedQueryExecutionContext
  ): Promise<GetCostAttributionSummaryResult>;
}

export interface GetRunEventsQuery {
  readonly runId: string;
  readonly afterSeq?: number;
  readonly limit?: number;
}

export interface GetRunEventsResult {
  readonly items: ReadonlyArray<EventEnvelope>;
  readonly nextCursor: number | null;
}

export interface IGetRunEventsUseCase {
  execute(
    query: GetRunEventsQuery,
    context: AuthorizedQueryExecutionContext
  ): Promise<GetRunEventsResult>;
}

export interface SignalRunCommand {
  readonly runId: string;
  readonly signalType: SupportedSignalType;
  readonly reason?: string;
}

export interface CancelRunCommand {
  readonly runId: string;
  readonly signalType: 'CANCEL';
}

export interface SignalRunResult {
  readonly runId: string;
  readonly signalType: SupportedSignalType;
  readonly accepted: boolean;
}

export interface ISignalRunUseCase {
  execute(
    command: SignalRunCommand,
    context: AuthorizedCommandExecutionContext
  ): Promise<SignalRunResult>;
}

export interface ICancelRunUseCase {
  execute(
    command: CancelRunCommand,
    context: AuthorizedCommandExecutionContext
  ): Promise<SignalRunResult>;
}

export const SUPPORTED_RECOVER_RUN_TARGET_ADAPTERS = ['temporal'] as const;

export type RecoverRunTargetAdapter = (typeof SUPPORTED_RECOVER_RUN_TARGET_ADAPTERS)[number];

export function isRecoverRunTargetAdapter(value: string): value is RecoverRunTargetAdapter {
  return (SUPPORTED_RECOVER_RUN_TARGET_ADAPTERS as readonly string[]).includes(value);
}

export interface RecoverRunPlanRef {
  readonly uri: string;
  readonly sha256: string;
  readonly schemaVersion: string;
  readonly planId: string;
  readonly planVersion: string;
}

export interface RecoverRunCommand {
  readonly sourceRunId: string;
  readonly recoveryRunId: string;
  readonly targetAdapter?: RecoverRunTargetAdapter;
  readonly runExecutionContextRef?: RunExecutionContextRef;
  readonly planRef: RecoverRunPlanRef;
}

export interface RecoverRunResult {
  readonly sourceRunId: string;
  readonly recoveryRunId: string;
  readonly accepted: boolean;
}

export interface IRecoverRunUseCase {
  execute(
    command: RecoverRunCommand,
    context: AuthorizedCommandExecutionContext
  ): Promise<RecoverRunResult>;
}
