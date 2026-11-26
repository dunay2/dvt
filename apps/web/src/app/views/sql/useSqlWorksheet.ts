/** Bind the local worksheet to explicit scoped requests and the existing query cache. */
import { useCallback, useEffect, useMemo, useReducer, useRef, type Dispatch } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { WORKSPACE_SQL_MAX_LENGTH } from '@dvt/contracts';
import type { ISqlWorksheetPort } from '../../ports/sqlWorksheet';
import { SqlWorksheetQueryError } from '../../ports/sqlWorksheet';
import type { SqlWorksheetConnection, SqlWorksheetInsertion } from './sqlWorksheet.types';
import {
  createSqlWorksheetState,
  reduceSqlWorksheetState,
  type SqlWorksheetEvent,
  type SqlWorksheetState,
} from './sqlWorksheetState';

type WorksheetArgs = Readonly<{
  scopeKey: string;
  port: ISqlWorksheetPort;
  canExecute: boolean;
  canViewHistory: boolean;
  historyOpen: boolean;
  connections: readonly SqlWorksheetConnection[];
}>;

type RequestArgs = WorksheetArgs &
  Readonly<{
    state: SqlWorksheetState;
    dispatch: Dispatch<SqlWorksheetEvent>;
    onExecuted: () => void;
  }>;
type FinishedOutcome = Extract<SqlWorksheetEvent, { type: 'request-finished' }>['outcome'];

async function readSqlWorksheetOutcome(
  work: (signal: AbortSignal) => Promise<FinishedOutcome>,
  signal: AbortSignal
): Promise<FinishedOutcome | null> {
  try {
    return await work(signal);
  } catch (error) {
    if (signal.aborted) return null;
    return {
      kind: 'failure',
      reason: error instanceof SqlWorksheetQueryError ? error.reason : 'unavailable',
    };
  }
}

function useSqlWorksheetRequestOwnership(args: RequestArgs) {
  const { dispatch, canExecute, canViewHistory } = args;
  const owner = useMemo(
    () => ({ key: args.scopeKey, port: args.port }),
    [args.scopeKey, args.port]
  );
  const currentOwner = useRef(owner);
  currentOwner.current = owner;
  const latest = useRef(args);
  latest.current = args;
  const sequence = useRef(0);
  const pending = useRef<AbortController | null>(null);
  const stop = useCallback((): void => {
    sequence.current += 1;
    pending.current?.abort();
    pending.current = null;
    dispatch({ type: 'request-stop' });
  }, [dispatch]);
  useEffect(
    () => () => {
      sequence.current += 1;
      pending.current?.abort();
      pending.current = null;
    },
    [owner]
  );
  useEffect(() => {
    const kind = latest.current.state.pending?.kind;
    if (kind == null) return;
    const allowed = kind === 'execute' ? canExecute : canViewHistory;
    if (!allowed) stop();
  }, [canExecute, canViewHistory, stop]);
  return { owner, currentOwner, latest, sequence, pending, stop };
}

function useSqlWorksheetRequests(args: RequestArgs) {
  const ownership = useSqlWorksheetRequestOwnership(args);
  const { owner, currentOwner, latest, sequence, pending } = ownership;
  const perform = async (
    kind: 'execute' | 'restore',
    work: (signal: AbortSignal) => Promise<FinishedOutcome>
  ): Promise<void> => {
    if (currentOwner.current !== owner || pending.current != null) return;
    const id = ++sequence.current;
    const controller = new AbortController();
    pending.current = controller;
    args.dispatch({ type: 'request-start', id, kind });
    const current = () => sequence.current === id && currentOwner.current === owner;
    const outcome = await readSqlWorksheetOutcome(work, controller.signal);
    if (!current()) return;
    pending.current = null;
    if (outcome == null) return;
    args.dispatch({ type: 'request-finished', id, outcome });
    if (kind === 'execute') latest.current.onExecuted();
  };
  return { perform, stop: ownership.stop };
}

export function useSqlWorksheet(args: WorksheetArgs) {
  const [state, dispatch] = useReducer(reduceSqlWorksheetState, undefined, createSqlWorksheetState);
  const client = useQueryClient();
  const historyKey = useMemo(
    () => ['workspace-sql-history', args.scopeKey] as const,
    [args.scopeKey]
  );
  const history = useInfiniteQuery({
    queryKey: historyKey,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      args.port.listHistory(
        { limit: 20, ...(pageParam == null ? {} : { cursor: pageParam }) },
        signal
      ),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: args.canViewHistory && args.historyOpen,
    retry: false,
  });
  const requests = useSqlWorksheetRequests({
    ...args,
    state,
    dispatch,
    onExecuted: () => {
      void client.invalidateQueries({ queryKey: historyKey });
    },
  });
  const connection = args.connections.find((item) => item.id === state.connectionId) ?? null;
  const canRun =
    args.canExecute &&
    connection?.type === 'postgres' &&
    state.sql.trim().length > 0 &&
    state.sql.length <= WORKSPACE_SQL_MAX_LENGTH;
  const execute = async (): Promise<void> => {
    if (!canRun) return;
    if (state.pending != null) return;
    if (connection == null) return;
    await requests.perform('execute', async (signal) => ({
      kind: 'result',
      response: await args.port.execute(
        { connectionId: connection.id, sql: state.sql, limit: state.limit },
        signal
      ),
    }));
  };
  const restore = async (id: string): Promise<void> => {
    if (!args.canViewHistory || state.pending != null) return;
    await requests.perform('restore', async (signal) => ({
      kind: 'restored',
      execution: (await args.port.getExecution(id, signal)).execution,
    }));
  };
  return {
    state,
    connection,
    canRun,
    history,
    execute,
    restore,
    canExecute: args.canExecute,
    canViewHistory: args.canViewHistory,
    tooLong: state.sql.length > WORKSPACE_SQL_MAX_LENGTH,
    setSql(sql: string): void {
      if (state.pending?.kind === 'restore') requests.stop();
      dispatch({ type: 'text', sql });
    },
    setConnection(id: string | null): void {
      requests.stop();
      dispatch({ type: 'connection', id });
    },
    setLimit: (value: number) => dispatch({ type: 'limit', value }),
    acceptInsertion: (sql: string, insertion: SqlWorksheetInsertion) =>
      dispatch({ type: 'inserted', sql, insertion }),
  };
}
