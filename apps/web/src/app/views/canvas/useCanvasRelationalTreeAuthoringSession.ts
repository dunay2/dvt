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
  const { restorationUnavailable, restore } = useCanvasRelationalAuthoringDraftHydration({
    enabled,
    transformNode,
    document: args.document,
    inputs,
    hydrateExisting,
    state,
  });
  const editable = authoring?.canEditNode === true && !restorationUnavailable;
  const effectiveDraft = !state.active && seed != null ? seed.draft : state.joinDraft;
  const { analysis } = useCanvasRelationalTreeAnalysisContext({
    document: effectiveDraft,
    transformNode,
    nodes,
    edges,
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
    if (!enabled || !editable) return false;
    if (!state.active && !hydrateExisting()) state.setActive(true);
    return true;
  }, [state.active, state.setActive, editable, enabled, hydrateExisting]);
  const graph = useCanvasRelationalGraphAuthoring({
    editable: enabled && editable,
    inputs,
    analysis,
    state,
    start,
    outputRelationId: effectiveOutputRelationId,
    sourceNodeIds: !state.active && seed != null ? seed.inputIds : state.slots.selectedInputIds,
  });
  const sourceOutputInitialization = useCanvasSourceOutputInitialization({
    state,
    editable: enabled && editable,
    inputs,
    nodeId: transformNode.id,
    nodes,
    edges,
  });
  const applyCurrent = (document?: SubstraitDocument): W.CanvasRelationalTreeApplyResult =>
    sourceOutputInitialization.blocked
      ? { outcome: 'rejected', reason: 'source_output_unavailable' }
      : apply(document);
  const removal = useCanvasRelationalTreeRemoval({
    analysis,
    enabled: enabled && editable,
    sourceNodeIds: !state.active && seed != null ? seed.inputIds : state.slots.selectedInputIds,
    outputRelationId: effectiveOutputRelationId,
    state,
    start,
  });
  return {
    restorationUnavailable,
    analysis,
    ...graph,
    removal,
    cleared: prepared.cleared,
    sourceOutputInitialization,
    applyRejection: sourceOutputInitialization.failed
      ? { outcome: 'rejected' as const, reason: 'source_output_unavailable' as const }
      : state.applyRejection,
    active: state.active,
    baselineDraft,
    seed,
    apply: () => applyCurrent(),
    applyOutputOrder: (document: SubstraitDocument) =>
      applyCurrent(document).outcome !== 'rejected',
    cancel: restore,
    joinDraft: state.joinDraft,
    operation: state.operation,
    selectedInputIds: state.slots.selectedInputIds,
    setJoinDraft: (draft: SubstraitDocument) => {
      if (start()) state.setJoinDraft(draft);
    },
    start,
    positions: state.positions,
    setPositions: state.setPositions,
    hasIncompleteGraph: prepared.hasIncompleteGraph,
    hasDraftChanges: prepared.hasDraftChanges,
  } as const;
}
