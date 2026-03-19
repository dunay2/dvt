import type { EventEnvelope, RunStatusSnapshot } from '@dvt/contracts';

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

export type GetRunStatusResult = Pick<
  RunStatusSnapshot,
  'runId' | 'status' | 'substatus' | 'message' | 'startedAt' | 'completedAt' | 'hash'
> & {
  readonly tenantId: string;
  readonly enriched: boolean;
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
