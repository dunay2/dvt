import { useEffect, type Dispatch, type SetStateAction } from 'react';

import { canvasDraftSession, type CanvasDraftSession } from './canvasDraftSession';
import type { GraphAuthorityQueryState } from './canvasDraftLifecycle.types';
import type { CanvasDraftLifecycleCanonicalSnapshot } from './canvasDraftLifecycleSnapshot';

type UseCanvasDraftCanonicalReconcileArgs = {
  graphAuthorityQuery: GraphAuthorityQueryState;
  draftSession: CanvasDraftSession;
  setDraftSession: Dispatch<SetStateAction<CanvasDraftSession>>;
  canonicalSnapshot: CanvasDraftLifecycleCanonicalSnapshot;
};

export function useCanvasDraftCanonicalReconcile({
  graphAuthorityQuery,
  draftSession,
  setDraftSession,
  canonicalSnapshot,
}: UseCanvasDraftCanonicalReconcileArgs) {
  useEffect(() => {
    if (graphAuthorityQuery.isPending || graphAuthorityQuery.isError) {
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
    graphAuthorityQuery.isError,
    graphAuthorityQuery.isPending,
    setDraftSession,
  ]);
}
