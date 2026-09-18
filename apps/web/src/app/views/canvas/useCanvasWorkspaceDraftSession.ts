/** Owned concern: bind the local Canvas draft aggregate to one workspace identity at a time. */
import { useCallback, useRef, useState, type Dispatch, type SetStateAction } from 'react';

import { canvasDraftSession, type CanvasDraftSession } from './canvasDraftSession';

type ScopedDraftSession = {
  workspaceLayoutKey: string;
  session: CanvasDraftSession;
};

export type CanvasDraftSessionCommandRunner = <
  TResult extends
    | Readonly<{ outcome: 'applied'; draftSession: CanvasDraftSession }>
    | Readonly<{ outcome: 'rejected' }>,
>(
  command: (currentSession: CanvasDraftSession) => TResult
) => TResult;

function resolveStateUpdate<T>(update: SetStateAction<T>, current: T): T {
  return typeof update === 'function' ? (update as (value: T) => T)(current) : update;
}

export function useCanvasWorkspaceDraftSession(
  workspaceLayoutKey: string
): readonly [
  CanvasDraftSession,
  Dispatch<SetStateAction<CanvasDraftSession>>,
  CanvasDraftSessionCommandRunner,
] {
  const activeWorkspaceLayoutKeyRef = useRef(workspaceLayoutKey);
  activeWorkspaceLayoutKeyRef.current = workspaceLayoutKey;

  const [scopedSession, setScopedSession] = useState<ScopedDraftSession>(() => ({
    workspaceLayoutKey,
    session: canvasDraftSession.machine.createBootstrapping(),
  }));
  const draftSession =
    scopedSession.workspaceLayoutKey === workspaceLayoutKey
      ? scopedSession.session
      : canvasDraftSession.machine.createBootstrapping();
  const currentSessionRef = useRef(draftSession);
  currentSessionRef.current = draftSession;

  const commitDraftSession = useCallback(
    (nextSession: CanvasDraftSession) => {
      if (activeWorkspaceLayoutKeyRef.current !== workspaceLayoutKey) return;
      if (nextSession === currentSessionRef.current) return;
      currentSessionRef.current = nextSession;
      setScopedSession({ workspaceLayoutKey, session: nextSession });
    },
    [workspaceLayoutKey]
  );

  const setDraftSession = useCallback<Dispatch<SetStateAction<CanvasDraftSession>>>(
    (update) => {
      if (activeWorkspaceLayoutKeyRef.current !== workspaceLayoutKey) return;
      commitDraftSession(resolveStateUpdate(update, currentSessionRef.current));
    },
    [commitDraftSession, workspaceLayoutKey]
  );

  const runDraftSessionCommand = useCallback<CanvasDraftSessionCommandRunner>(
    (command) => {
      const result = command(currentSessionRef.current);
      if (result.outcome === 'applied') commitDraftSession(result.draftSession);
      return result;
    },
    [commitDraftSession]
  );

  return [draftSession, setDraftSession, runDraftSessionCommand] as const;
}
