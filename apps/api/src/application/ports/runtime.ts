import type {
  EventEnvelope,
  MaterializationEvidence,
  RunExecutionContextRef,
  RunStatusSnapshot,
  TransformationExecutor,
} from '@dvt/contracts';

import type { AuthorizationAction } from '../../domain/auth/types.js';

import type { AuthorizedCommandExecutionContext, AuthorizedExecutionContext } from './auth.js';

export type AuthorizedQueryExecutionContext = AuthorizedExecutionContext<
  Extract<AuthorizationAction, { readonly kind: 'query' }>
>;

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

export type GetRunStatusResult = Pick<
  RunStatusSnapshot,
  'runId' | 'status' | 'substatus' | 'message' | 'startedAt' | 'completedAt' | 'execution'
> & {
  readonly tenantId: string;
  readonly enriched: boolean;
  readonly snapshotStaleness: RunSnapshotStaleness;
  readonly executor?: TransformationExecutor;
  readonly currentStepId?: string;
  readonly failedStepId?: string;
  readonly errorReason?: string;
  readonly materialization?: MaterializationEvidence;
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
  readonly provider: 'temporal' | 'conductor' | 'mock';
  readonly createdAt?: string;
  readonly status?: RunStatusSnapshot['status'];
}

export interface ListRunsResult {
  readonly items: ReadonlyArray<RunListItemDto>;
  readonly nextCursor: string | null;
}

export interface IListRunsUseCase {
  execute(query: ListRunsQuery, context: AuthorizedQueryExecutionContext): Promise<ListRunsResult>;
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

export type CancelRunCommand = SignalRunCommand & {
  readonly signalType: 'CANCEL';
};

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

export type RecoverRunTargetAdapter = 'temporal' | 'conductor' | 'mock';

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
