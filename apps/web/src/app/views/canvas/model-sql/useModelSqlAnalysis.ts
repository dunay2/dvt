/** Fence explicit async SQL actions by current buffer, scope and cancellation. */
import { useEffect, useRef, useState } from 'react';
import { CanvasModelSqlQueryError, type ModelSqlFailure } from '../../../ports/canvasModelSql';

export function useModelSqlAnalysis(revision: string) {
  const current = useRef({
    revision,
    buffer: '',
    generation: 0,
    controller: null as AbortController | null,
  });
  const [busy, setBusy] = useState(false);
  current.current.revision = revision;
  const cancel = () => {
    current.current.controller?.abort();
    current.current.controller = null;
    current.current.generation += 1;
    setBusy(false);
  };
  useEffect(() => {
    cancel();
  }, [revision]);
  useEffect(
    () => () => {
      current.current.controller?.abort();
      current.current.generation += 1;
    },
    []
  );
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
      current.current.controller?.abort();
      const controller = new AbortController();
      const generation = ++current.current.generation;
      current.current.controller = controller;
      setBusy(true);
      const isCurrent = () =>
        !controller.signal.aborted &&
        current.current.generation === generation &&
        current.current.revision === revision &&
        (buffer == null || current.current.buffer === buffer);
      try {
        const result = await action(controller.signal, isCurrent);
        return isCurrent() ? result : null;
      } catch (error) {
        if (isCurrent())
          fail(error instanceof CanvasModelSqlQueryError ? error.reason : 'unavailable');
        return null;
      } finally {
        if (current.current.generation === generation) {
          current.current.controller = null;
          setBusy(false);
        }
      }
    },
  };
}
