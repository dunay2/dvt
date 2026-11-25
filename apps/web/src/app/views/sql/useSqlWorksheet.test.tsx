// @vitest-environment jsdom
/** Prove request ownership, authorization and history recovery around real query-cache state. */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type {
  ExecuteWorkspaceSqlResponse,
  ListWorkspaceSqlExecutionsResponse,
  GetWorkspaceSqlExecutionResponse,
} from '@dvt/contracts';
import type { ISqlWorksheetPort } from '../../ports/sqlWorksheet';
import {
  buildSqlWorksheetTestResponse,
  buildSqlWorksheetTestExecution,
  SQL_TEST_EXECUTION_ID,
} from './sqlWorksheet.test-fixtures';
import { useSqlWorksheet } from './useSqlWorksheet';

type Args = Parameters<typeof useSqlWorksheet>[0];
let current: ReturnType<typeof useSqlWorksheet>;
let root: Root;
let container: HTMLDivElement;
let client: QueryClient;
let args: Args;

function Harness({ value }: Readonly<{ value: Args }>): null {
  current = useSqlWorksheet(value);
  return null;
}
function render(value = args): void {
  args = value;
  act(() =>
    root.render(
      <QueryClientProvider client={client}>
        <Harness key={value.scopeKey} value={value} />
      </QueryClientProvider>
    )
  );
}
async function ready(): Promise<void> {
  await act(async () => {
    current.setSql('SELECT 1 AS total');
    current.setConnection('warehouse');
  });
}
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  container = document.createElement('div');
  root = createRoot(container);
  const port: ISqlWorksheetPort = {
    execute: vi.fn(async () => buildSqlWorksheetTestResponse()),
    listHistory: vi.fn(async (): Promise<ListWorkspaceSqlExecutionsResponse> => ({
      schemaVersion: 'workspace-sql-execution-history.v1',
      executions: [],
      nextCursor: null,
    })),
    getExecution: vi.fn(async (): Promise<GetWorkspaceSqlExecutionResponse> => ({
      schemaVersion: 'workspace-sql-execution-detail.v1',
      execution: buildSqlWorksheetTestExecution(),
    })),
  };
  args = {
    scopeKey: 'tenant/project/dev',
    port,
    canExecute: true,
    canViewHistory: true,
    historyOpen: false,
    connections: [{ id: 'warehouse', name: 'Warehouse', type: 'postgres', database: 'analytics' }],
  };
  render();
});
afterEach(() => {
  act(() => root.unmount());
  client.clear();
  vi.unstubAllGlobals();
});

function holdExecution(): {
  finish: (value: ExecuteWorkspaceSqlResponse) => void;
  signals: AbortSignal[];
} {
  let finish!: (value: ExecuteWorkspaceSqlResponse) => void;
  const signals: AbortSignal[] = [];
  const response = new Promise<ExecuteWorkspaceSqlResponse>((resolve) => {
    finish = resolve;
  });
  args.port.execute = vi.fn((_request, signal) => {
    if (signal != null) signals.push(signal);
    return response;
  });
  render();
  return { finish, signals };
}

it('admits one request and retains the captured result when the buffer changes', async () => {
  const held = holdExecution();
  await ready();
  let operation!: Promise<void>;
  act(() => {
    operation = current.execute();
    void current.execute();
  });
  expect(args.port.execute).toHaveBeenCalledOnce();
  expect(current.state.pending?.kind).toBe('execute');
  act(() => current.setSql('SELECT 2 AS total'));
  await act(async () => {
    held.finish(buildSqlWorksheetTestResponse());
    await operation;
  });
  expect(current.state.sql).toBe('SELECT 2 AS total');
  expect(current.state.execution?.sql).toBe('SELECT 1 AS total');
  expect(current.state.result?.rows).toEqual([{ values: ['1'] }]);
});

it.each(['connection', 'permission', 'scope'] as const)(
  'rejects late results after a %s change',
  async (change) => {
    const held = holdExecution();
    await ready();
    let operation!: Promise<void>;
    act(() => {
      operation = current.execute();
    });
    if (change === 'connection') act(() => current.setConnection(null));
    else
      render({
        ...args,
        ...(change === 'permission' ? { canExecute: false } : { scopeKey: 'other/project/dev' }),
      });
    expect(held.signals[0]?.aborted).toBe(true);
    await act(async () => {
      held.finish(buildSqlWorksheetTestResponse());
      await operation;
    });
    expect(current.state.execution).toBeNull();
    expect(current.state.result).toBeNull();
    expect(current.state.pending).toBeNull();
  }
);

it('restores immutable SQL and metadata without executing or inventing historic rows', async () => {
  await act(async () => current.restore(SQL_TEST_EXECUTION_ID));
  expect(args.port.getExecution).toHaveBeenCalledWith(
    SQL_TEST_EXECUTION_ID,
    expect.any(AbortSignal)
  );
  expect(args.port.execute).not.toHaveBeenCalled();
  expect(current.state.sql).toBe('SELECT 1 AS total');
  expect(current.state.connectionId).toBe('warehouse');
  expect(current.state.execution?.executionId).toBe(SQL_TEST_EXECUTION_ID);
  expect(current.state.result).toBeNull();
  expect(current.state.insertions).toEqual([]);
});

it('denies execution and history IO when their exact grants are missing', async () => {
  render({ ...args, canExecute: false, canViewHistory: false, historyOpen: true });
  await ready();
  await act(async () => {
    await current.execute();
    await current.restore(SQL_TEST_EXECUTION_ID);
  });
  expect(current.canRun).toBe(false);
  expect(args.port.execute).not.toHaveBeenCalled();
  expect(args.port.listHistory).not.toHaveBeenCalled();
  expect(args.port.getExecution).not.toHaveBeenCalled();
});
