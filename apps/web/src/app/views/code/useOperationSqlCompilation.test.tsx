// @vitest-environment jsdom
import { act, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import type { OperationSqlSyntaxResult } from './operationSqlSyntax';
import { useOperationSqlCompilation } from './useOperationSqlCompilation';

class ControlledWorker {
  static instances: ControlledWorker[] = [];
  onmessage?: (event: MessageEvent<OperationSqlSyntaxResult>) => void;
  onerror?: () => void;
  postMessage = vi.fn();
  terminate = vi.fn();

  constructor() {
    ControlledWorker.instances.push(this);
  }

  complete(result: OperationSqlSyntaxResult): void {
    this.onmessage?.(new MessageEvent('message', { data: result }));
  }
}

type Session = ReturnType<typeof useOperationSqlCompilation>;
const TASK = 'operations/tarea.task.sql';
let root: Root;
let current: Session;

function Observe({ path, source }: { path: string; source: string }): null {
  const session = useOperationSqlCompilation(path, source);
  useEffect(() => {
    current = session;
  }, [session]);
  return null;
}

function render(path: string, source: string): void {
  act(() => root.render(<Observe path={path} source={source} />));
}

beforeEach(() => {
  root = createRoot(document.createElement('div'));
  ControlledWorker.instances = [];
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('Worker', ControlledWorker);
});

afterEach(() => {
  act(() => root.unmount());
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it('checks only the submitted draft and retires an old attempt on edit or file change', () => {
  render(TASK, 'CREATE TASK tarea AS SELECT 2;');
  expect(ControlledWorker.instances).toHaveLength(0);
  act(() => current.compile());
  const first = ControlledWorker.instances[0]!;
  expect(first.postMessage).toHaveBeenCalledWith('CREATE TASK tarea AS SELECT 2;');
  render(TASK, 'CREATE TASK tarea AS SELECT FROM;');
  expect(first.terminate).toHaveBeenCalledOnce();
  act(() => first.complete({ kind: 'valid' }));
  expect(current.result).toBeUndefined();
  act(() => current.compile());
  const second = ControlledWorker.instances[1]!;
  expect(second.postMessage).toHaveBeenCalledWith('CREATE TASK tarea AS SELECT FROM;');
  render('operations/otra.task.sql', 'CREATE TASK tarea AS SELECT FROM;');
  expect(second.terminate).toHaveBeenCalledOnce();
  act(() => second.complete({ kind: 'valid' }));
  expect(current.result).toBeUndefined();
});

it('shows unavailable if parsing times out and accepts an explicit retry', () => {
  vi.useFakeTimers();
  render(TASK, 'CREATE TASK tarea AS SELECT 2;');
  act(() => current.compile());
  act(() => {
    vi.advanceTimersByTime(15_000);
  });
  expect(current.result).toEqual({ kind: 'unavailable' });
  expect(ControlledWorker.instances[0]?.terminate).toHaveBeenCalledOnce();
  act(() => current.compile());
  act(() => ControlledWorker.instances[1]?.complete({ kind: 'valid' }));
  expect(current.result).toEqual({ kind: 'valid' });
});

it.each(['models/task.sql', 'operations/rebuild.procedure.sql', 'models/tarea.task.sql'])(
  'leaves %s with its existing file actions',
  (path) => {
    render(path, 'SELECT 1;');
    expect(current.available).toBe(false);
    act(() => current.compile());
    expect(ControlledWorker.instances).toHaveLength(0);
  }
);
