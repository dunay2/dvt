/**
 * Owned concern: admit and consume one revision-bound card-removal proposal.
 * @baseline ADR-0064: a card deletion edits the existing authoring graph, not relational algebra.
 * @decision Require explicit consent for dependent cards and reject changed working sets.
 * @consequence Cancel is read-only; confirmation publishes one discardable graph update.
 * @version 1.0.0
 */
import { useEffect, useRef, useState } from 'react';
import type { useCanvasRelationAnalysisSession } from './useCanvasRelationAnalysisSession';
import type { useCanvasRelationalTreeDraftState } from './useCanvasRelationalTreeDraftState';
import {
  prepareCanvasCardRemoval,
  type CanvasCardRemovalProposal,
  type CanvasCardRemovalSnapshot,
} from './canvasCardRemoval';
import {
  CARD_REMOVAL_REJECTION,
  CanvasCardRemovalError,
  type CanvasCardRemovalRejection,
} from './CanvasCardRemovalError';

export function useCanvasRelationalTreeRemoval(
  args: Readonly<{
    enabled: boolean;
    analysis: ReturnType<typeof useCanvasRelationAnalysisSession>;
    sourceNodeIds: readonly string[];
    outputRelationId: string | null;
    state: ReturnType<typeof useCanvasRelationalTreeDraftState>;
    start: () => boolean;
  }>
) {
  const { analysis, state } = args;
  const [pending, setPending] = useState<CanvasCardRemovalProposal | null>(null);
  const [error, setError] = useState<CanvasCardRemovalRejection | null>(null);
  const consent = useRef<Readonly<{
    proposal: CanvasCardRemovalProposal;
    revision: number | undefined;
    permission: string | undefined;
  }> | null>(null);
  useEffect(
    () => () => {
      consent.current = null;
    },
    []
  );
  const snapshot = (): CanvasCardRemovalSnapshot => ({
    document: analysis?.document ?? null,
    inputIds: args.sourceNodeIds,
    sources: state.pendingSources,
    operations: state.stagedOperations,
    outputRelationId: args.outputRelationId,
  });
  const requireWritable = () => {
    if (!args.enabled) throw new CanvasCardRemovalError(CARD_REMOVAL_REJECTION.readOnly);
    if (analysis?.error != null)
      throw new CanvasCardRemovalError(CARD_REMOVAL_REJECTION.unavailable);
    if (
      analysis?.document != null &&
      (!analysis.session.hasDocument(analysis.document) ||
        analysis.revision !== analysis.session.revision)
    )
      throw new CanvasCardRemovalError(CARD_REMOVAL_REJECTION.stale);
  };
  const accept = (proposal: CanvasCardRemovalProposal) => {
    requireWritable();
    if (!sameSnapshot(proposal.snapshot, snapshot()))
      throw new CanvasCardRemovalError(CARD_REMOVAL_REJECTION.stale);
    if (!args.start()) throw new CanvasCardRemovalError(CARD_REMOVAL_REJECTION.readOnly);
    state.setJoinDraft(null);
    state.setOperation(null);
    state.slots.resetOperands();
    state.restoreIncomplete({ ...proposal.graph, positions: state.positions });
  };
  const report = (failure: unknown) =>
    setError(
      failure instanceof CanvasCardRemovalError ? failure.code : CARD_REMOVAL_REJECTION.unavailable
    );
  const cancel = () => {
    consent.current = null;
    setPending(null);
  };
  return {
    pending,
    error,
    cancel,
    clearError: () => setError(null),
    remove: (id: string) => {
      cancel();
      setError(null);
      try {
        requireWritable();
        const proposal = prepareCanvasCardRemoval(snapshot(), id);
        if (proposal.dependents.length === 0 && !proposal.disconnectsOutput) accept(proposal);
        else {
          consent.current = {
            proposal,
            revision: analysis?.revision,
            permission: analysis?.permissionIdentity,
          };
          setPending(proposal);
        }
      } catch (failure) {
        report(failure);
      }
    },
    confirm: () => {
      const current = consent.current;
      if (current == null) return;
      cancel();
      try {
        if (
          current.revision !== analysis?.revision ||
          current.permission !== analysis?.permissionIdentity
        )
          throw new CanvasCardRemovalError(CARD_REMOVAL_REJECTION.stale);
        accept(current.proposal);
      } catch (failure) {
        report(failure);
      }
    },
  };
}

function sameSnapshot(
  before: CanvasCardRemovalSnapshot,
  after: CanvasCardRemovalSnapshot
): boolean {
  return (
    before.document === after.document &&
    before.sources === after.sources &&
    before.operations === after.operations &&
    before.outputRelationId === after.outputRelationId &&
    before.inputIds.length === after.inputIds.length &&
    before.inputIds.every((id, index) => id === after.inputIds[index])
  );
}
