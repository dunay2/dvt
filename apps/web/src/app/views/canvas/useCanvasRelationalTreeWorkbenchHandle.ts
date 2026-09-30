/** Owned concern: expose the existing edit session to the Model navigation guard. */
import { useImperativeHandle, type ForwardedRef } from 'react';
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
  // Existing canonical authoring is hydrated atomically with both its operation
  // identity and semantic document. New graph composition is governed separately
  // by hasIncompleteGraph, so Apply does not need another per-operation matrix here.
  const completeSemanticDraft = session.operation != null && session.joinDraft != null;
  const handle = {
    hasUnappliedChanges:
      directEdit.pending || (session.active && (session.hasDraftChanges || pendingCondition)),
    canApply:
      !directEdit.pending &&
      !pendingCondition &&
      model.authoringAvailable &&
      session.hasDraftChanges &&
      (session.hasIncompleteGraph ||
        session.cleared ||
        (session.output.relationId != null && completeSemanticDraft)),
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
