/**
 * Owned concern: expose the edit transaction and hand accepted inspector identity to presentation.
 * @baseline ADR-0064: applying a draft preserves canonical relation identities.
 * @decision Retain staged selection after accepted Apply without clearing pending authoring state.
 * @consequence Partial and rejected writes retain their editor; explicit close is not undone.
 * @version 1.1.0
 */
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
  directEdit: Readonly<{ pending: boolean; discard: () => void }>,
  onAppliedSelection?: (relationId: string) => void
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
      !session.sourceOutputInitialization.blocked &&
      model.authoringAvailable &&
      session.hasDraftChanges &&
      (session.hasIncompleteGraph ||
        session.cleared ||
        (session.output.relationId != null && completeSemanticDraft)),
    applyRejection: model.session.applyRejection,
    apply: () => {
      const selectedId = session.staged.selectedId ?? session.occurrences.selectedId;
      const result = session.apply();
      if (result.outcome !== 'rejected' && selectedId != null) onAppliedSelection?.(selectedId);
      return result;
    },
    cancel: () => {
      model.session.cancel();
      if (directEdit.pending) directEdit.discard();
    },
  };
  useImperativeHandle(ref, () => handle);
  return handle;
}
