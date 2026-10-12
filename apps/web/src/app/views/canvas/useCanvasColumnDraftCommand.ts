/** One serialized draft/CAS boundary for asynchronous column commands. */
import { useCallback, useEffect, useRef } from 'react';
import { jcsCanonicalize } from '@dvt/crypto';
import type { CanvasDraftSession } from './canvasDraftSession';
import type { CanvasDraftSessionCommandRunner } from './useCanvasWorkspaceDraftSession';

type Result =
  | Readonly<{ outcome: 'applied'; draftSession: CanvasDraftSession }>
  | Readonly<{ outcome: 'rejected'; reason: string }>;

export function useCanvasColumnDraftCommand(run: CanvasDraftSessionCommandRunner) {
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const lifetime = useRef(new AbortController());
  useEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    return () => controller.abort();
  }, [run]);
  return useCallback(
    <T extends Result>(
      command: (draft: CanvasDraftSession, signal: AbortSignal) => Promise<T>,
      rejected: () => T
    ): Promise<T> => {
      const signal = lifetime.current.signal;
      const execute = async (): Promise<T> => {
        try {
          signal.throwIfAborted();
          const snapshot = run((draft) => ({ outcome: 'no_changes', draft })).draft;
          const result = await command(snapshot, signal);
          signal.throwIfAborted();
          if (result.outcome !== 'applied') return result;
          return run((current) => {
            if (current !== snapshot && jcsCanonicalize(current) !== jcsCanonicalize(snapshot))
              return rejected();
            return result;
          });
        } catch {
          return rejected();
        }
      };
      const result = queue.current.then(execute, execute);
      queue.current = result;
      return result;
    },
    [run]
  );
}
