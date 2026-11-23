/** Owned concern: retain a syntax result only for its exact editor buffer. */
import { useEffect, useState } from 'react';

import { isWorkspaceOperationSqlPath } from './codeWorkspaceFileEditPosture';
import type { OperationSqlSyntaxResult } from './operationSqlSyntax';

export type OperationSqlCompilation =
  OperationSqlSyntaxResult | Readonly<{ kind: 'checking' | 'unavailable' }>;

type CompilationAttempt = Readonly<{
  path: string;
  source: string;
  result: OperationSqlCompilation;
}>;

function checkOperationSyntax(source: string, onResult: (result: OperationSqlCompilation) => void) {
  let active = true;
  let worker: Worker | undefined;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const stop = () => {
    if (!active) return;
    active = false;
    clearTimeout(timeout);
    worker?.terminate();
  };
  const finish = (result: OperationSqlCompilation) => {
    if (!active) return;
    stop();
    onResult(result);
  };
  const fail = () => finish({ kind: 'unavailable' });
  try {
    worker = new Worker(new URL('./operationSqlSyntax.worker.ts', import.meta.url), {
      type: 'module',
    });
    worker.onmessage = ({ data }: MessageEvent<OperationSqlSyntaxResult>) => finish(data);
    worker.onerror = fail;
    worker.onmessageerror = fail;
    timeout = setTimeout(fail, 15_000);
    worker.postMessage(source);
  } catch {
    fail();
  }
  return stop;
}

function taskSqlPath(filePath: string | undefined) {
  if (!isWorkspaceOperationSqlPath(filePath)) return undefined;
  return filePath?.toLowerCase().endsWith('.task.sql') ? filePath : undefined;
}

function attemptForBuffer(
  attempt: CompilationAttempt | undefined,
  path: string | undefined,
  source: string
) {
  if (attempt?.source !== source) return undefined;
  return attempt.path === path ? attempt : undefined;
}

export function useOperationSqlCompilation(filePath: string | undefined, source: string) {
  const path = taskSqlPath(filePath);
  const [attempt, setAttempt] = useState<CompilationAttempt>();
  const current = attemptForBuffer(attempt, path, source);

  useEffect(() => {
    if (attempt !== current) {
      setAttempt(undefined);
      return;
    }
    if (current?.result.kind !== 'checking') return;

    return checkOperationSyntax(current.source, (result) => setAttempt({ ...current, result }));
  }, [attempt, current]);

  return {
    available: path != null,
    result: current?.result,
    compile: () => {
      if (path == null || current?.result.kind === 'checking') return;
      setAttempt({ path, source, result: { kind: 'checking' } });
    },
  };
}
