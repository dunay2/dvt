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
    onAccepted?: (id: string) => void;
  }> | null>(null);
  useEffect(function synchronizeExternalSurface() {
    return () => {
      consent.current = null;
    };
  }, []);
  const requireWritable = function requireWritableHandler() {
    if (!args.enabled) throw new CanvasCardRemovalError(CARD_REMOVAL_REJECTION.readOnly);
    if (analysis?.error != null)
      throw new CanvasCardRemovalError(CARD_REMOVAL_REJECTION.unavailable);
    assertRemovalAnalysisCurrent(analysis);
  };
  const accept = function acceptHandler(
    proposal: CanvasCardRemovalProposal,
    onAccepted?: (id: string) => void
  ) {
    requireWritable();
    if (!sameSnapshot(proposal.snapshot, captureCanvasCardRemovalSnapshot(args)))
      throw new CanvasCardRemovalError(CARD_REMOVAL_REJECTION.stale);
    if (!args.start()) throw new CanvasCardRemovalError(CARD_REMOVAL_REJECTION.readOnly);
    onAccepted?.(proposal.target.id);
    state.setJoinDraft(null);
    state.setOperation(null);
    state.slots.resetOperands();
    state.restoreIncomplete({ ...proposal.graph, positions: state.positions });
  };
  const report = function reportHandler(failure: unknown) {
    return setError(
      failure instanceof CanvasCardRemovalError ? failure.code : CARD_REMOVAL_REJECTION.unavailable
    );
  };
  const cancel = function cancelHandler() {
    consent.current = null;
    setPending(null);
  };
  return {
    pending,
    error,
    cancel,
    clearError: () => setError(null),
    remove(id: string, onAccepted?: (id: string) => void) {
      cancel();
      setError(null);
      try {
        requireWritable();
        const proposal = prepareCanvasCardRemoval(captureCanvasCardRemovalSnapshot(args), id);
        if (proposal.dependents.length === 0 && !proposal.disconnectsOutput)
          accept(proposal, onAccepted);
        else {
          consent.current = {
            proposal,
            revision: analysis?.revision,
            permission: analysis?.permissionIdentity,
            onAccepted,
          };
          setPending(proposal);
        }
      } catch (failure) {
        report(failure);
      }
    },
    confirm() {
      const current = consent.current;
      if (current == null) return;
      cancel();
      try {
        assertRemovalConsentCurrent(current, analysis);
        accept(current.proposal, current.onAccepted);
      } catch (failure) {
        report(failure);
      }
    },
  };
}

function assertRemovalAnalysisCurrent(
  analysis: ReturnType<typeof useCanvasRelationAnalysisSession>
): void {
  if (analysis?.document == null) return;
  if (!analysis.session.hasDocument(analysis.document))
    throw new CanvasCardRemovalError(CARD_REMOVAL_REJECTION.stale);
  if (analysis.revision !== analysis.session.revision)
    throw new CanvasCardRemovalError(CARD_REMOVAL_REJECTION.stale);
}

function sameSnapshot(
  before: CanvasCardRemovalSnapshot,
  after: CanvasCardRemovalSnapshot
): boolean {
  return (
    (['document', 'sources', 'operations', 'outputRelationId'] as const).every(
      (key) => before[key] === after[key]
    ) &&
    before.inputIds.length === after.inputIds.length &&
    before.inputIds.every((id, index) => id === after.inputIds[index])
  );
}

function captureCanvasCardRemovalSnapshot(
  args: Parameters<typeof useCanvasRelationalTreeRemoval>[0]
): CanvasCardRemovalSnapshot {
  return {
    document: args.analysis?.document ?? null,
    inputIds: args.sourceNodeIds,
    sources: args.state.pendingSources,
    operations: args.state.stagedOperations,
    outputRelationId: args.outputRelationId,
  };
}

function assertRemovalConsentCurrent(
  consent: Readonly<{ revision: number | undefined; permission: string | undefined }>,
  analysis: ReturnType<typeof useCanvasRelationAnalysisSession>
): void {
  if (consent.revision !== analysis?.revision)
    throw new CanvasCardRemovalError(CARD_REMOVAL_REJECTION.stale);
  if (consent.permission !== analysis?.permissionIdentity)
    throw new CanvasCardRemovalError(CARD_REMOVAL_REJECTION.stale);
}
