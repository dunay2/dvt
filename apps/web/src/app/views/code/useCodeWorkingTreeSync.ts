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
  reduceCodeWorkingTreeSync,
} from './codeWorkingTreeSyncModel';

const DEFAULT_DEBOUNCE_MS = 400;

type CodeWorkingTreeSyncState = ReturnType<typeof createCodeWorkingTreeSyncState>;
type CodeWorkingTreeSyncEvent = Parameters<typeof reduceCodeWorkingTreeSync>[1];

type UseCodeWorkingTreeSyncInput = Readonly<{
  file: FileContent | undefined;
  commandPort: IWorkspaceFileContentCommandPort;
  debounceMs?: number;
  onFileSynchronized?: (receipt: WorkspaceFileSaveReceipt) => Promise<void>;
}>;

export function useCodeWorkingTreeSync({
  file,
  commandPort,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  onFileSynchronized,
}: UseCodeWorkingTreeSyncInput) {
  const [state, setState] = useState<CodeWorkingTreeSyncState | null>(() =>
    file ? createCodeWorkingTreeSyncState(file) : null
  );
  const stateRef = useRef(state);
  const requestIdRef = useRef(0);
  const activeSyncRef = useRef<Promise<void> | null>(null);

  const replaceState = useCallback((nextState: CodeWorkingTreeSyncState | null) => {
    stateRef.current = nextState;
    setState(nextState);
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
        requiresReconciliation: onFileSynchronized != null,
      });
      if (onFileSynchronized != null) {
        try {
          await onFileSynchronized(receipt);
          transition({ type: 'reconciliation_succeeded' });
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
  }, [commandPort, onFileSynchronized, transition]);

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
      if (
        current.phase === 'conflict' ||
        current.phase === 'failed' ||
        current.phase === 'reconciliation_failed'
      ) {
        return false;
      }
      if (current.phase === 'syncing' || current.phase === 'reconciling') {
        await activeSyncRef.current;
      } else {
        await synchronizeOnce();
      }
    }
  }, [synchronizeOnce]);

  const retry = useCallback(() => {
    const current = stateRef.current;
    if (
      current?.phase === 'reconciliation_failed' &&
      current.pendingReconciliation != null &&
      onFileSynchronized != null
    ) {
      transition({ type: 'reconciliation_started' });
      const operation = (async () => {
        try {
          await onFileSynchronized(current.pendingReconciliation!);
          transition({ type: 'reconciliation_succeeded' });
        } catch {
          transition({ type: 'reconciliation_failed' });
        }
      })().finally(() => {
        if (activeSyncRef.current === operation) {
          activeSyncRef.current = null;
        }
      });
      activeSyncRef.current = operation;
      return operation;
    }

    transition({ type: 'retry_requested' });
    return Promise.resolve();
  }, [onFileSynchronized, transition]);

  const loadAuthoritative = useCallback(
    (nextFile: FileContent) => {
      replaceState(createCodeWorkingTreeSyncState(nextFile));
    },
    [replaceState]
  );

  return {
    value: state?.value ?? '',
    phase: state?.phase ?? ('read_only' as const),
    updateValue,
    flush,
    retry,
    loadAuthoritative,
  };
}
