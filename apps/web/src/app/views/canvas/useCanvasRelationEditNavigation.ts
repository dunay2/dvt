/** Card navigation leaves the existing edit transaction only after an explicit decision. */
import { useRef, useState } from 'react';
import type { CanvasRelationalTreeWorkbenchHandle } from './useCanvasRelationalTreeWorkbenchHandle';

export function useCanvasRelationEditNavigation({
  editing,
  selectedRelationId,
  session,
  onSelect,
}: Readonly<{
  editing: boolean;
  selectedRelationId: string | null;
  session: CanvasRelationalTreeWorkbenchHandle;
  onSelect: (relationId: string | null) => void;
}>) {
  const [pending, setPending] = useState<{ relationId: string | null } | null>(null);
  const accepted = useRef<typeof pending>(null);
  const stay = () => setPending(null);
  const navigate = (relationId: string | null) => {
    onSelect(relationId);
    stay();
  };
  return {
    pending: pending != null,
    stay,
    select: (relationId: string | null) => {
      if (relationId === selectedRelationId) return;
      if (session.hasUnappliedChanges) setPending({ relationId });
      else {
        if (editing) session.cancel();
        navigate(relationId);
      }
    },
    discard: () => {
      if (pending == null) return;
      session.cancel();
      navigate(pending.relationId);
    },
    apply: () => {
      if (pending == null || accepted.current === pending || !session.canApply) return;
      const result = session.apply();
      if (result.outcome !== 'rejected') {
        accepted.current = pending;
        navigate(pending.relationId);
      }
    },
  };
}
