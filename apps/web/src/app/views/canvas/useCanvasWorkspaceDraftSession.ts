/** Owned concern: bind the local Canvas draft aggregate to one workspace identity at a time. */
import { useCallback, useRef, useState, type Dispatch, type SetStateAction } from 'react';

import { canvasDraftSession, type CanvasDraftSession } from './canvasDraftSession';

type ScopedDraftSession = {
  workspaceLayoutKey: string;
  session: CanvasDraftSession;
};

function resolveStateUpdate<T>(update: SetStateAction<T>, current: T): T {
  return typeof update === 'function' ? (update as (value: T) => T)(current) : update;
}

export function useCanvasWorkspaceDraftSession(
  workspaceLayoutKey: string
): readonly [CanvasDraftSession, Dispatch<SetStateAction<CanvasDraftSession>>] {
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

  const setDraftSession = useCallback<Dispatch<SetStateAction<CanvasDraftSession>>>(
    (update) => {
      if (activeWorkspaceLayoutKeyRef.current !== workspaceLayoutKey) {
        return;
      }

      setScopedSession((current) => {
        if (activeWorkspaceLayoutKeyRef.current !== workspaceLayoutKey) {
          return current;
        }

        const currentSession =
          current.workspaceLayoutKey === workspaceLayoutKey
            ? current.session
            : canvasDraftSession.machine.createBootstrapping();

        const nextSession = resolveStateUpdate(update, currentSession);
        if (current.workspaceLayoutKey === workspaceLayoutKey && nextSession === currentSession) {
          return current;
        }

        return {
          workspaceLayoutKey,
          session: nextSession,
        };
      });
    },
    [workspaceLayoutKey]
  );

  return [draftSession, setDraftSession] as const;
}
