/** Owned concern: coordinate one discardable guided relation-authoring session. */
import { useCallback } from 'react';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import type * as W from './canvasRelationalTreeWorkbench.types';
import { createCanvasRelationalTreeApplyCommand } from './canvasRelationalTreeApplyCommand';
import { useCanvasRelationalTreeDraftState } from './useCanvasRelationalTreeDraftState';
import { useCanvasRelationalTreeExistingSeed } from './useCanvasRelationalTreeExistingSeed';
import { useCanvasRelationalTreeRemoval } from './useCanvasRelationalTreeRemoval';
import type { CanvasRelationalTreeProjection } from './canvasRelationalTreeProjection';
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import { useCanvasRelationalTreeAnalysisContext } from './useCanvasRelationalTreeAnalysisContext';
import { useCanvasRelationalAuthoringDraftHydration } from './useCanvasRelationalAuthoringDraftHydration';
import { useCanvasRelationalGraphAuthoring } from './useCanvasRelationalGraphAuthoring';
import { prepareCanvasRelationalTreeApply } from './canvasRelationalTreeApplyDraft';
import { useCanvasSourceOutputInitialization } from './useCanvasSourceOutputInitialization';
import { useCanvasSourceInputRecovery } from './useCanvasSourceInputRecovery';
export function useCanvasRelationalTreeAuthoringSession(
  args: Readonly<{
    enabled: boolean;
    transformNode: CanonicalNode;
    nodes: readonly CanonicalNode[];
    edges: readonly CanonicalEdge[];
    inputs: readonly CanvasDvtCompositionInput[];
    projection: CanvasRelationalTreeProjection | null;
    document: SubstraitDocument | null;
    authoring?: W.CanvasRelationalTreeAuthoringContract;
  }>
) {
  const { authoring, edges, enabled, inputs, nodes, transformNode } = args;
  const state = useCanvasRelationalTreeDraftState();
  const { hydrateExisting, baselineDraft, seed } = useCanvasRelationalTreeExistingSeed({
    document: args.document,
    projection: args.projection,
    onHydrate: state.hydrate,
  });
  const { restorationUnavailable, restore: restoreSnapshot } =
    useCanvasRelationalAuthoringDraftHydration({
      enabled,
      transformNode,
      document: args.document,
      inputs,
      hydrateExisting,
      state,
    });
  const editable = authoring?.canEditNode === true && !restorationUnavailable;
  const effectiveDraft = !state.active && seed != null ? seed.draft : state.joinDraft;
  const sourceInputRecovery = useCanvasSourceInputRecovery({
    state,
    editable: enabled && editable,
    nodeId: transformNode.id,
    nodes,
    edges,
    inputs,
    document: effectiveDraft,
  });
  const { analysis } = useCanvasRelationalTreeAnalysisContext({
    document: effectiveDraft,
    transformNode,
    nodes,
    edges: sourceInputRecovery.edges,
  });
  const effectiveOutputRelationId =
    (!state.active && seed != null ? seed.outputRelationId : state.outputRelationId) ?? null;
  const prepared = prepareCanvasRelationalTreeApply({
    transformNode,
    active: state.active,
    joinDraft: state.joinDraft,
    operation: !state.active && seed != null ? seed.operation : state.operation,
    hasSelectedInputs: state.slots.selectedInputIds.length > 0,
    pending: {
      sources: state.pendingSources,
      operations: state.stagedOperations,
      outputRelationId: effectiveOutputRelationId,
      positions: state.positions,
    },
    baselineOutputId: seed?.outputRelationId ?? null,
    semanticRootId: analysis?.document == null ? null : analysis.session.rootId,
  });
  const apply = createCanvasRelationalTreeApplyCommand({
    ...prepared.request,
    authoring,
    editable,
    reject: state.setApplyRejection,
    reset: state.reset,
  });
  const start = useCallback(() => {
    if (!enabled || !editable || sourceInputRecovery.isPending()) return false;
    if (!state.active && !hydrateExisting()) state.setActive(true);
    return true;
  }, [
    state.active,
    state.setActive,
    editable,
    enabled,
    hydrateExisting,
    sourceInputRecovery.isPending,
  ]);
  const graph = useCanvasRelationalGraphAuthoring({
    editable: enabled && editable,
    inputs: sourceInputRecovery.inputs,
    analysis,
    state,
    start,
    outputRelationId: effectiveOutputRelationId,
    sourceNodeIds: !state.active && seed != null ? seed.inputIds : state.slots.selectedInputIds,
  });
  const sourceOutputInitialization = useCanvasSourceOutputInitialization({
    state,
    editable: enabled && editable,
    inputs: sourceInputRecovery.inputs,
    nodeId: transformNode.id,
    nodes,
    edges: sourceInputRecovery.edges,
  });
  const applyCurrent = (
    document?: SubstraitDocument,
    signal?: AbortSignal
  ): W.CanvasRelationalTreeApplyResult | Promise<W.CanvasRelationalTreeApplyResult> => {
    if (sourceOutputInitialization.blocked || sourceInputRecovery.isPending())
      return { outcome: 'rejected', reason: 'source_output_unavailable' };
    if (sourceInputRecovery.additions.length === 0) return apply(document);
    return sourceInputRecovery.runApply((lifetime) =>
      apply(document, {
        inputAdditions: sourceInputRecovery.additions,
        signal: signal == null ? lifetime : AbortSignal.any([signal, lifetime]),
      })
    );
  };
  const removal = useCanvasRelationalTreeRemoval({
    analysis,
    enabled: enabled && editable,
    sourceNodeIds: !state.active && seed != null ? seed.inputIds : state.slots.selectedInputIds,
    outputRelationId: effectiveOutputRelationId,
    state,
    start,
  });
  const restore = () => {
    sourceInputRecovery.cancel();
    restoreSnapshot();
  };
  return {
    restorationUnavailable,
    analysis,
    ...graph,
    removal,
    cleared: prepared.cleared,
    sourceOutputInitialization,
    sourceInputRecovery,
    applyRejection: sourceOutputInitialization.failed
      ? { outcome: 'rejected' as const, reason: 'source_output_unavailable' as const }
      : state.applyRejection,
    active: state.active,
    baselineDraft,
    seed,
    apply: (signal?: AbortSignal) => applyCurrent(undefined, signal),
    applyOutputOrder: (document: SubstraitDocument) => {
      if (sourceInputRecovery.additions.length > 0) return false;
      const result = applyCurrent(document);
      return !(result instanceof Promise) && result.outcome !== 'rejected';
    },
    cancel: restore,
    joinDraft: state.joinDraft,
    operation: state.operation,
    selectedInputIds: state.slots.selectedInputIds,
    setJoinDraft: (draft: SubstraitDocument) => {
      if (!start()) return false;
      state.setJoinDraft(draft);
    },
    start,
    positions: state.positions,
    setPositions: state.setPositions,
    hasIncompleteGraph: prepared.hasIncompleteGraph,
    hasDraftChanges: prepared.hasDraftChanges || sourceInputRecovery.additions.length > 0,
  } as const;
}
