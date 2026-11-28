/** Fence explicit async SQL actions by current buffer, scope and cancellation. */
import { useEffect, useRef, useState } from 'react';
import type { ModelSqlCompilationResponse, ModelSqlContextResponse } from '@dvt/contracts';
import { CanvasModelSqlQueryError, type ModelSqlFailure } from '../../../ports/canvasModelSql';

export async function compileWithCurrentModelSqlContext(
  context: ModelSqlContextResponse,
  compile: (context: ModelSqlContextResponse) => Promise<ModelSqlCompilationResponse>,
  refresh: () => Promise<ModelSqlContextResponse>,
  isCurrent: () => boolean
): Promise<ModelSqlCompilationResponse | null> {
  try {
    return await compile(context);
  } catch (error) {
    if (!(error instanceof CanvasModelSqlQueryError) || error.reason !== 'stale') throw error;
    if (!isCurrent()) return null;
    const refreshed = await refresh();
    return isCurrent() ? compile(refreshed) : null;
  }
}

type ModelSqlAnalysisState = {
  revision: string;
  buffer: string;
  controller: AbortController | null;
};

function abortModelSqlAnalysis(active: ModelSqlAnalysisState): void {
  const controller = active.controller;
  active.controller = null;
  controller?.abort();
}

function isCurrentModelSqlAnalysis(
  active: ModelSqlAnalysisState,
  request: Readonly<{ revision: string; buffer: string | null; controller: AbortController }>
): boolean {
  if (active.controller !== request.controller) return false;
  if (active.revision !== request.revision) return false;
  return request.buffer == null || active.buffer === request.buffer;
}

export function useModelSqlAnalysis(revision: string) {
  const current = useRef<ModelSqlAnalysisState>({
    revision,
    buffer: '',
    controller: null,
  });
  const [busy, setBusy] = useState(false);
  current.current.revision = revision;
  const cancel = () => {
    abortModelSqlAnalysis(current.current);
    setBusy(false);
  };
  useEffect(() => {
    cancel();
  }, [revision]);
  useEffect(() => () => abortModelSqlAnalysis(current.current), []);
  return {
    busy,
    observeBuffer: (buffer: string) => {
      current.current.buffer = buffer;
    },
    cancel,
    run: async <T>(
      buffer: string | null,
      action: (signal: AbortSignal, isCurrent: () => boolean) => Promise<T>,
      fail: (reason: ModelSqlFailure) => void
    ): Promise<T | null> => {
      abortModelSqlAnalysis(current.current);
      const controller = new AbortController();
      current.current.controller = controller;
      setBusy(true);
      const request = { buffer, controller, revision };
      const isCurrent = () => isCurrentModelSqlAnalysis(current.current, request);
      try {
        const result = await action(controller.signal, isCurrent);
        return isCurrent() ? result : null;
      } catch (error) {
        if (isCurrent())
          fail(error instanceof CanvasModelSqlQueryError ? error.reason : 'unavailable');
        return null;
      } finally {
        if (current.current.controller === controller) {
          current.current.controller = null;
          setBusy(false);
        }
      }
    },
  };
}
