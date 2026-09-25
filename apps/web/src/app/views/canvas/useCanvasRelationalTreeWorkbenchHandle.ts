/** Owned concern: expose the existing edit session to the Model navigation guard. */
import { useImperativeHandle, type ForwardedRef } from 'react';
import { isCanvasJoinOperation } from './canvasRelationalTreeJoinType';
import { isCanvasSetOperation } from './canvasRelationalOperationChoices';
import type { useCanvasRelationalTreeWorkbenchModel } from './useCanvasRelationalTreeWorkbenchModel';
import type {
  CanvasRelationalTreeApplyResult,
  RelationalApplyRejection,
} from './canvasRelationalTreeWorkbench.types';

export type CanvasRelationalTreeWorkbenchHandle = Readonly<{
  hasUnappliedChanges: boolean;
  canApply: boolean;
  applyRejection: RelationalApplyRejection | null;
  apply: () => CanvasRelationalTreeApplyResult;
  cancel: () => void;
}>;

export function useCanvasRelationalTreeWorkbenchHandle(
  ref: ForwardedRef<CanvasRelationalTreeWorkbenchHandle>,
  model: ReturnType<typeof useCanvasRelationalTreeWorkbenchModel>,
  pendingCondition: boolean,
  directEdit: Readonly<{ pending: boolean; discard: () => void }>
): CanvasRelationalTreeWorkbenchHandle {
  const { session } = model;
  const changed =
    session.operation !== session.seed?.operation ||
    session.joinDraft !== session.baselineDraft ||
    session.selectedInputIds.join(',') !== session.seed?.inputIds.join(',') ||
    session.appendInput != null;
  const handle = {
    hasUnappliedChanges:
      directEdit.pending ||
      (session.active && (changed || pendingCondition) && session.selectedInputIds.length > 0),
    canApply:
      !directEdit.pending &&
      !pendingCondition &&
      model.authoringAvailable &&
      model.session.appendInput == null &&
      ((isCanvasJoinOperation(model.session.operation) && model.session.joinDraft != null) ||
        (model.session.operation === 'cross_join' && model.session.joinDraft != null) ||
        (model.session.operation === 'projection' && model.session.selectedInputIds.length === 1) ||
        (isCanvasSetOperation(model.session.operation) &&
          model.session.selectedInputIds.length >= 2)),
    applyRejection: model.session.applyRejection,
    apply: model.session.apply,
    cancel: () => {
      model.session.cancel();
      if (directEdit.pending) directEdit.discard();
    },
  };
  useImperativeHandle(ref, () => handle);
  return handle;
}
