/** Keep SQL and semantic edits inside the existing Model leave/apply/discard decision. */
import { useRef, type RefObject } from 'react';
import type { CanvasRelationalTreeWorkbenchHandle } from '../useCanvasRelationalTreeWorkbenchHandle';

export function useCanvasModelDraftHandle(
  visual: RefObject<CanvasRelationalTreeWorkbenchHandle>,
  sql: RefObject<CanvasRelationalTreeWorkbenchHandle>
) {
  const combined = useRef<CanvasRelationalTreeWorkbenchHandle>({
    get hasUnappliedChanges() {
      return (
        visual.current?.hasUnappliedChanges === true || sql.current?.hasUnappliedChanges === true
      );
    },
    get canApply() {
      return sql.current?.hasUnappliedChanges === true
        ? visual.current?.hasUnappliedChanges !== true && sql.current.canApply
        : visual.current?.canApply === true;
    },
    get applyRejection() {
      return visual.current?.applyRejection ?? sql.current?.applyRejection ?? null;
    },
    get applying() {
      return visual.current?.applying === true || sql.current?.applying === true;
    },
    apply: () => {
      if (sql.current?.hasUnappliedChanges === true) {
        if (visual.current?.hasUnappliedChanges === true)
          return { outcome: 'rejected', reason: 'command_unavailable' };
        return sql.current.apply();
      }
      return visual.current?.apply() ?? { outcome: 'no_changes' };
    },
    cancel: () => {
      sql.current?.cancel();
      visual.current?.cancel();
    },
  });
  return combined;
}
