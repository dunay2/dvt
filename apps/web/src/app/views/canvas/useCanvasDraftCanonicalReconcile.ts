import { useEffect, type Dispatch, type SetStateAction } from 'react';

import { canvasDraftSession, type CanvasDraftSession } from './canvasDraftSession';
import type { GraphSnapshotQueryState } from './canvasDraftLifecycle.types';
import type { CanvasDraftLifecycleCanonicalSnapshot } from './canvasDraftLifecycleSnapshot';

type UseCanvasDraftCanonicalReconcileArgs = {
  graphSnapshotQuery: GraphSnapshotQueryState;
  draftSession: CanvasDraftSession;
  setDraftSession: Dispatch<SetStateAction<CanvasDraftSession>>;
  canonicalSnapshot: CanvasDraftLifecycleCanonicalSnapshot;
};

export function useCanvasDraftCanonicalReconcile({
  graphSnapshotQuery,
  draftSession,
  setDraftSession,
  canonicalSnapshot,
}: UseCanvasDraftCanonicalReconcileArgs) {
  useEffect(() => {
    if (graphSnapshotQuery.isPending || graphSnapshotQuery.isError) {
      return;
    }
    if (draftSession.syncState === 'bootstrapping') {
      return;
    }

    setDraftSession((currentSession) =>
      canvasDraftSession.workingSet.reconcileSnapshot(currentSession, canonicalSnapshot)
    );
  }, [
    canonicalSnapshot,
    draftSession.syncState,
    graphSnapshotQuery.isError,
    graphSnapshotQuery.isPending,
    setDraftSession,
  ]);
}
