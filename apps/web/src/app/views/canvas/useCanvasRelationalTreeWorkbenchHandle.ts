/**
 * Owned concern: expose the edit transaction and hand accepted inspector identity to presentation.
 * @baseline ADR-0064: applying a draft preserves canonical relation identities.
 * @decision Retain staged selection after accepted Apply without clearing pending authoring state.
 * @consequence Partial and rejected writes retain their editor; explicit close is not undone.
 * @version 1.1.0
 */
import { useEffect, useImperativeHandle, useRef, useState, type ForwardedRef } from 'react';
import type { useCanvasRelationalTreeWorkbenchModel } from './useCanvasRelationalTreeWorkbenchModel';
import type {
  CanvasRelationalTreeApplyResult,
  RelationalApplyRejection,
} from './canvasRelationalTreeWorkbench.types';

export type CanvasRelationalTreeWorkbenchHandle = Readonly<{
  hasUnappliedChanges: boolean;
  canApply: boolean;
  applyRejection: RelationalApplyRejection | null;
  applying?: boolean;
  apply: () => CanvasRelationalTreeApplyResult | Promise<CanvasRelationalTreeApplyResult>;
  cancel: () => void;
}>;

export function useCanvasRelationalTreeWorkbenchHandle(
  ref: ForwardedRef<CanvasRelationalTreeWorkbenchHandle>,
  model: ReturnType<typeof useCanvasRelationalTreeWorkbenchModel>,
  pendingCondition: boolean,
  directEdit: Readonly<{ pending: boolean; discard: () => void }>,
  onAppliedSelection?: (relationId: string) => void,
  onSettled?: () => void
): CanvasRelationalTreeWorkbenchHandle {
  const { session } = model;
  const pending = useRef<AbortController | null>(null);
  const [applying, setApplying] = useState(false);
  useEffect(
    () => () => {
      pending.current?.abort();
      pending.current = null;
    },
    []
  );
  // Existing canonical authoring is hydrated atomically with both its operation
  // identity and semantic document. New graph composition is governed separately
  // by hasIncompleteGraph, so Apply does not need another per-operation matrix here.
  const completeSemanticDraft = session.operation != null && session.joinDraft != null;
  const handle = {
    hasUnappliedChanges:
      applying ||
      directEdit.pending ||
      (session.active && (session.hasDraftChanges || pendingCondition)),
    applying,
    canApply:
      !directEdit.pending &&
      !applying &&
      !session.sourceInputRecovery.busy &&
      !pendingCondition &&
      !session.sourceOutputInitialization.blocked &&
      model.authoringAvailable &&
      session.hasDraftChanges &&
      (session.hasIncompleteGraph ||
        session.cleared ||
        (session.output.relationId != null && completeSemanticDraft)),
    applyRejection: model.session.applyRejection,
    apply: () => {
      if (pending.current != null)
        return { outcome: 'rejected', reason: 'command_unavailable' } as const;
      const controller = new AbortController();
      pending.current = controller;
      const selectedId = session.staged.selectedId ?? session.occurrences.selectedId;
      const settle = (result: CanvasRelationalTreeApplyResult) => {
        if (controller.signal.aborted)
          return { outcome: 'rejected', reason: 'command_unavailable' } as const;
        if (result.outcome !== 'rejected') {
          if (selectedId != null) onAppliedSelection?.(selectedId);
          onSettled?.();
        }
        return result;
      };
      const result = session.apply(controller.signal);
      if (result instanceof Promise) {
        setApplying(true);
        return result.then(settle).finally(() => {
          if (pending.current === controller) {
            pending.current = null;
            setApplying(false);
          }
        });
      }
      pending.current = null;
      return settle(result);
    },
    cancel: () => {
      pending.current?.abort();
      pending.current = null;
      setApplying(false);
      model.session.cancel();
      onSettled?.();
      if (directEdit.pending) directEdit.discard();
    },
  };
  useImperativeHandle(ref, () => handle);
  return handle;
}
