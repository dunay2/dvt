/** Keep the local SQL buffer separate from captured execution and history receipts. */
import { WORKSPACE_SQL_DEFAULT_LIMIT, WORKSPACE_SQL_MAX_LIMIT } from '@dvt/contracts';
import type {
  ExecuteWorkspaceSqlResponse,
  WorkspaceSqlExecution,
  WorkspaceSqlResult,
} from '@dvt/contracts';
import type { SqlWorksheetFailure } from '../../ports/sqlWorksheet';
import type { SqlWorksheetInsertion } from './sqlWorksheet.types';
import { retainSqlWorksheetInsertions } from './sqlWorksheetInsertions';

export type SqlWorksheetState = Readonly<{
  sql: string;
  connectionId: string | null;
  limit: number;
  insertions: readonly SqlWorksheetInsertion[];
  pending: Readonly<{ id: number; kind: 'execute' | 'restore' }> | null;
  execution: WorkspaceSqlExecution | null;
  result: WorkspaceSqlResult | null;
  failure: SqlWorksheetFailure | null;
}>;

type RequestFinished = Readonly<{
  type: 'request-finished';
  id: number;
  outcome:
    | Readonly<{ kind: 'result'; response: ExecuteWorkspaceSqlResponse }>
    | Readonly<{ kind: 'restored'; execution: WorkspaceSqlExecution }>
    | Readonly<{ kind: 'failure'; reason: SqlWorksheetFailure }>;
}>;

export type SqlWorksheetEvent =
  | Readonly<{ type: 'text'; sql: string }>
  | Readonly<{ type: 'connection'; id: string | null }>
  | Readonly<{ type: 'limit'; value: number }>
  | Readonly<{ type: 'inserted'; sql: string; insertion: SqlWorksheetInsertion }>
  | Readonly<{ type: 'request-start'; id: number; kind: 'execute' | 'restore' }>
  | Readonly<{ type: 'request-stop' }>
  | RequestFinished;

export function createSqlWorksheetState(): SqlWorksheetState {
  return {
    sql: '',
    connectionId: null,
    limit: WORKSPACE_SQL_DEFAULT_LIMIT,
    insertions: [],
    pending: null,
    execution: null,
    result: null,
    failure: null,
  };
}

function completeSqlWorksheetRequest(
  state: SqlWorksheetState,
  event: RequestFinished
): SqlWorksheetState {
  if (state.pending?.id !== event.id) return state;
  const outcome = event.outcome;
  if (outcome.kind === 'failure') return { ...state, pending: null, failure: outcome.reason };
  if (outcome.kind === 'result')
    return {
      ...state,
      pending: null,
      execution: outcome.response.execution,
      result: outcome.response.result ?? null,
      failure: null,
    };
  return {
    ...state,
    pending: null,
    sql: outcome.execution.sql,
    connectionId: outcome.execution.connectionRef.connectionId,
    limit: outcome.execution.limit,
    execution: outcome.execution,
    result: null,
    insertions: [],
    failure: null,
  };
}

function changeSqlWorksheetLimit(state: SqlWorksheetState, value: number): SqlWorksheetState {
  if (!Number.isInteger(value)) return state;
  if (value < 1 || value > WORKSPACE_SQL_MAX_LIMIT) return state;
  return { ...state, limit: value };
}

function editSqlWorksheetBuffer(
  state: SqlWorksheetState,
  sql: string,
  insertions: readonly SqlWorksheetInsertion[]
): SqlWorksheetState {
  return {
    ...state,
    sql,
    insertions,
    pending: state.pending?.kind === 'restore' ? null : state.pending,
  };
}

export function reduceSqlWorksheetState(
  state: SqlWorksheetState,
  event: SqlWorksheetEvent
): SqlWorksheetState {
  switch (event.type) {
    case 'text':
      return editSqlWorksheetBuffer(
        state,
        event.sql,
        retainSqlWorksheetInsertions(event.sql, state.insertions)
      );
    case 'connection':
      return {
        ...state,
        connectionId: event.id,
        pending: null,
        execution: null,
        result: null,
        failure: null,
        insertions: state.insertions.filter((item) => item.connectionRef.connectionId === event.id),
      };
    case 'limit':
      return changeSqlWorksheetLimit(state, event.value);
    case 'inserted':
      return editSqlWorksheetBuffer(state, event.sql, [
        ...retainSqlWorksheetInsertions(event.sql, state.insertions),
        event.insertion,
      ]);
    case 'request-start':
      return {
        ...state,
        pending: { id: event.id, kind: event.kind },
        execution: null,
        result: null,
        failure: null,
      };
    case 'request-stop':
      return { ...state, pending: null, execution: null, result: null, failure: null };
    case 'request-finished':
      return completeSqlWorksheetRequest(state, event);
  }
}
