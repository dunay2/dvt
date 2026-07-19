/** Owned concern: orchestrate revision-guarded Code edits into the project working tree. */
import { useCallback, useEffect, useRef, useState } from 'react';

import type {
  FileContent,
  IWorkspaceFileContentCommandPort,
  WorkspaceFileSaveReceipt,
} from '../../ports/workspace';
import { WorkspaceFileRevisionConflictError } from '../../services/workspace/workspaceErrors';
import {
  createCodeWorkingTreeSyncState,
  isCodeWorkingTreeNavigationBlockedPhase,
  isCodeWorkingTreeReconciliationRetryablePhase,
  isCodeWorkingTreeReconciliationUnresolvedPhase,
  reduceCodeWorkingTreeSync,
  type CodeWorkingTreeReconciliationOutcome,
} from './codeWorkingTreeSyncModel';

const DEFAULT_DEBOUNCE_MS = 400;

type CodeWorkingTreeSyncState = ReturnType<typeof createCodeWorkingTreeSyncState>;
type CodeWorkingTreeSyncEvent = Parameters<typeof reduceCodeWorkingTreeSync>[1];

type UseCodeWorkingTreeSyncInput = Readonly<{
  file: FileContent | undefined;
  commandPort: IWorkspaceFileContentCommandPort;
  debounceMs?: number;
  reconcilePersistedFile?: (
    receipt: WorkspaceFileSaveReceipt
  ) => Promise<CodeWorkingTreeReconciliationOutcome>;
}>;

export function useCodeWorkingTreeSync({
  file,
  commandPort,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  reconcilePersistedFile,
}: UseCodeWorkingTreeSyncInput) {
  const [state, setState] = useState<CodeWorkingTreeSyncState | null>(() =>
    file ? createCodeWorkingTreeSyncState(file) : null
  );
  const stateRef = useRef(state);
  const requestIdRef = useRef(0);
  const activeSyncRef = useRef<Promise<void> | null>(null);
  const mountedRef = useRef(true);

  const replaceState = useCallback((nextState: CodeWorkingTreeSyncState | null) => {
    stateRef.current = nextState;
    if (mountedRef.current) {
      setState(nextState);
    }
  }, []);

  const transition = useCallback(
    (event: CodeWorkingTreeSyncEvent): CodeWorkingTreeSyncState | null => {
      const current = stateRef.current;
      if (!current) {
        return null;
      }
      const next = reduceCodeWorkingTreeSync(current, event);
      replaceState(next);
      return next;
    },
    [replaceState]
  );

  useEffect(() => {
    if (!file) {
      replaceState(null);
      return;
    }

    const current = stateRef.current;
    if (
      !current ||
      current.filePath !== file.path ||
      (current.phase === 'synchronized' && current.persistedRevision !== file.contentSha256)
    ) {
      replaceState(createCodeWorkingTreeSyncState(file));
    }
  }, [file, replaceState]);

  const synchronizeOnce = useCallback(async (): Promise<void> => {
    if (activeSyncRef.current) {
      await activeSyncRef.current;
      if (stateRef.current?.phase === 'modified') {
        await synchronizeOnce();
      }
      return;
    }

    const current = stateRef.current;
    if (!current || current.phase !== 'modified') {
      return;
    }

    const requestId = ++requestIdRef.current;
    const started = transition({ type: 'sync_started', requestId });
    const request = started?.inFlight;
    if (!request) {
      return;
    }

    const operation = (async () => {
      let receipt: WorkspaceFileSaveReceipt;
      try {
        receipt = await commandPort.saveFileContent({
          path: started.filePath,
          content: request.content,
          expectedRevision: {
            kind: 'content_sha256',
            value: request.expectedRevision,
          },
        });
      } catch (error: unknown) {
        transition({
          type:
            error instanceof WorkspaceFileRevisionConflictError ? 'sync_conflicted' : 'sync_failed',
          requestId,
        });
        return;
      }

      transition({
        type: 'content_persisted',
        requestId,
        receipt,
        requiresReconciliation: reconcilePersistedFile != null,
      });
      if (reconcilePersistedFile != null) {
        try {
          const outcome = await reconcilePersistedFile(receipt);
          transition({ type: 'reconciliation_completed', outcome });
        } catch {
          transition({ type: 'reconciliation_failed' });
        }
      }
    })().finally(() => {
      if (activeSyncRef.current === operation) {
        activeSyncRef.current = null;
      }
    });

    activeSyncRef.current = operation;
    await operation;
  }, [commandPort, reconcilePersistedFile, transition]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (state?.phase !== 'modified') {
      return;
    }

    const timer = window.setTimeout(() => {
      void synchronizeOnce();
    }, debounceMs);
    return () => window.clearTimeout(timer);
  }, [debounceMs, state?.phase, state?.value, state?.persistedRevision, synchronizeOnce]);

  const updateValue = useCallback(
    (value: string) => {
      transition({ type: 'edited', value });
    },
    [transition]
  );

  const flush = useCallback(async (): Promise<boolean> => {
    for (;;) {
      const current = stateRef.current;
      if (!current || current.phase === 'synchronized') {
        return true;
      }
      if (current.phase === 'conflict' || current.phase === 'failed') {
        return false;
      }
      if (isCodeWorkingTreeReconciliationUnresolvedPhase(current.phase)) {
        return true;
      }
      if (current.phase === 'syncing' || current.phase === 'reconciling') {
        await activeSyncRef.current;
      } else {
        await synchronizeOnce();
      }
    }
  }, [synchronizeOnce]);

  const retry = useCallback(async (): Promise<void> => {
    const current = stateRef.current;
    if (
      current != null &&
      isCodeWorkingTreeReconciliationRetryablePhase(current.phase) &&
      current.pendingReconciliation != null &&
      reconcilePersistedFile != null
    ) {
      transition({ type: 'reconciliation_started' });
      const operation = (async () => {
        try {
          const outcome = await reconcilePersistedFile(current.pendingReconciliation!);
          transition({ type: 'reconciliation_completed', outcome });
        } catch {
          transition({ type: 'reconciliation_failed' });
        }
      })().finally(() => {
        if (activeSyncRef.current === operation) {
          activeSyncRef.current = null;
        }
      });
      activeSyncRef.current = operation;
      await operation;
      return;
    }

    const retried = transition({ type: 'retry_requested' });
    if (retried?.phase === 'modified') {
      await synchronizeOnce();
    }
  }, [reconcilePersistedFile, synchronizeOnce, transition]);

  const loadAuthoritative = useCallback(
    (nextFile: FileContent) => {
      replaceState(createCodeWorkingTreeSyncState(nextFile));
    },
    [replaceState]
  );

  return {
    value: state?.value ?? '',
    phase: state?.phase ?? ('read_only' as const),
    navigationBlocked: state == null ? false : isCodeWorkingTreeNavigationBlockedPhase(state.phase),
    updateValue,
    flush,
    retry,
    loadAuthoritative,
  };
}
