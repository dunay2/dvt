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

export function useOperationSqlCompilation(filePath: string | undefined, source: string) {
  const path =
    isWorkspaceOperationSqlPath(filePath) && filePath?.toLowerCase().endsWith('.task.sql')
      ? filePath
      : undefined;
  const [attempt, setAttempt] = useState<CompilationAttempt>();
  const current = attempt?.path === path && attempt?.source === source ? attempt : undefined;

  useEffect(() => {
    if (attempt !== current) {
      setAttempt(undefined);
      return;
    }
    if (current?.result.kind !== 'checking') return;

    let active = true;
    let worker: Worker | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const stop = () => {
      active = false;
      clearTimeout(timeout);
      worker?.terminate();
    };
    const finish = (result: OperationSqlCompilation) => {
      if (!active) return;
      stop();
      setAttempt({ ...current, result });
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
      worker.postMessage(current.source);
    } catch {
      fail();
    }
    return () => {
      if (active) stop();
    };
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
