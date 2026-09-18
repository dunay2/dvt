/** Owned concern: expose the existing edit session to the Model navigation guard. */
import { useImperativeHandle, type ForwardedRef } from 'react';
import type { useCanvasRelationalTreeWorkbenchModel } from './useCanvasRelationalTreeWorkbenchModel';

export type CanvasRelationalTreeWorkbenchHandle = Readonly<{
  hasUnappliedChanges: boolean;
  canApply: boolean;
  apply: () => void;
  cancel: () => void;
}>;

export function useCanvasRelationalTreeWorkbenchHandle(
  ref: ForwardedRef<CanvasRelationalTreeWorkbenchHandle>,
  model: ReturnType<typeof useCanvasRelationalTreeWorkbenchModel>,
  pendingCondition: boolean
): CanvasRelationalTreeWorkbenchHandle {
  const { session } = model;
  const changed =
    session.operation !== 'inner_join' ||
    session.joinDraft !== session.baselineDraft ||
    session.appendInput != null;
  const handle = {
    hasUnappliedChanges:
      session.active && (changed || pendingCondition) && session.selectedInputIds.length > 0,
    canApply:
      !pendingCondition &&
      model.authoringAvailable &&
      model.session.appendInput == null &&
      ((model.session.operation === 'inner_join' && model.session.joinDraft != null) ||
        (model.session.operation === 'projection' && model.session.selectedInputIds.length === 1) ||
        (model.session.operation === 'union_all' && model.session.selectedInputIds.length >= 2)),
    apply: model.session.apply,
    cancel: model.session.cancel,
  };
  useImperativeHandle(ref, () => handle);
  return handle;
}
