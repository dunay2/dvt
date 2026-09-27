/** Owned concern: coordinate one discardable guided relation-authoring session. */
import { useCallback } from 'react';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import type * as W from './canvasRelationalTreeWorkbench.types';
import { useCanvasRelationalTreeApplyCommand } from './useCanvasRelationalTreeApplyCommand';
import { useCanvasRelationalTreeDraftState } from './useCanvasRelationalTreeDraftState';
import { useCanvasRelationalTreeExistingSeed } from './useCanvasRelationalTreeExistingSeed';
import { useCanvasRelationalTreeRemoval } from './useCanvasRelationalTreeRemoval';
import type { CanvasRelationalTreeProjection } from './canvasRelationalTreeProjection';
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import { useCanvasRelationalTreeAnalysisContext } from './useCanvasRelationalTreeAnalysisContext';
import { createCanvasRelationalAuthoringDraft } from './canvasRelationalAuthoringDraft';
import { useCanvasRelationalAuthoringDraftHydration } from './useCanvasRelationalAuthoringDraftHydration';
import { useCanvasRelationalGraphAuthoring } from './useCanvasRelationalGraphAuthoring';
import {
  areCanvasInspectorNodeDraftsEqual,
  canonicalizeCanvasInspectorNodeDraft,
  createCanvasInspectorNodeDraft,
} from './canvasInspectorAuthoringModel';
import { createCanvasRelationalTreeApplyDraft } from './canvasRelationalTreeApplyDraft';
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
  const editable = authoring?.canEditNode === true;
  const state = useCanvasRelationalTreeDraftState();
  const { hydrateExisting, baselineDraft, seed } = useCanvasRelationalTreeExistingSeed({
    document: args.document,
    projection: args.projection,
    onHydrate: state.hydrate,
  });
  useCanvasRelationalAuthoringDraftHydration({
    enabled,
    transformNode,
    document: args.document,
    inputs,
    hydrateExisting,
    state,
  });
  const effectiveDraft = !state.active && seed != null ? seed.draft : state.joinDraft;
  const { analysis } = useCanvasRelationalTreeAnalysisContext({
    document: effectiveDraft,
    transformNode,
    nodes,
    edges,
  });
  const effectiveInputIds =
    !state.active && seed != null ? seed.inputIds : state.slots.selectedInputIds;
  const effectiveOutputRelationId =
    (!state.active && seed != null ? seed.outputRelationId : state.outputRelationId) ?? null;
  const cleared =
    state.active &&
    state.joinDraft == null &&
    state.operation == null &&
    state.slots.selectedInputIds.length === 0 &&
    state.pendingSources.length === 0 &&
    state.stagedOperations.length === 0;
  const outputChanged = effectiveOutputRelationId !== (seed?.outputRelationId ?? null);
  const outputSelectsSemanticRoot =
    analysis?.document != null &&
    effectiveOutputRelationId != null &&
    effectiveOutputRelationId === analysis.session.rootId;
  const hasIncompleteGraph =
    state.pendingSources.length > 0 ||
    state.stagedOperations.length > 0 ||
    (outputChanged && !outputSelectsSemanticRoot);
  const relationalAuthoringDraft = hasIncompleteGraph
    ? createCanvasRelationalAuthoringDraft({
        sources: state.pendingSources,
        operations: state.stagedOperations,
        outputRelationId: effectiveOutputRelationId,
        positions: state.positions,
      })
    : undefined;
  const applyOperation = !state.active && seed != null ? seed.operation : state.operation;
  const applyDraft = createCanvasRelationalTreeApplyDraft({
    transformNode,
    relationalAuthoringDraft: cleared ? null : relationalAuthoringDraft,
    joinDraft: state.joinDraft,
    operation: applyOperation,
  });
  const hasDraftChanges = !areCanvasInspectorNodeDraftsEqual(
    createCanvasInspectorNodeDraft(transformNode),
    canonicalizeCanvasInspectorNodeDraft(transformNode, applyDraft)
  );
  const apply = useCanvasRelationalTreeApplyCommand({
    cleared,
    relationalAuthoringDraft: cleared ? null : relationalAuthoringDraft,
    authoring,
    editable,
    joinDraft: state.joinDraft,
    operation: applyOperation,
    reject: state.setApplyRejection,
    reset: state.reset,
    transformNode,
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
  });
  const removal = useCanvasRelationalTreeRemoval({
    analysis,
    enabled: enabled && editable,
    active: state.active,
    selectedInputIds: state.slots.selectedInputIds,
    seed,
    hydrate: hydrateExisting,
    clear: state.clear,
    accept: state.hydrate,
  });
  return {
    analysis,
    ...graph,
    removal,
    cleared,
    applyRejection: state.applyRejection,
    active: state.active,
    baselineDraft,
    seed,
    apply: () => apply(),
    applyOutputOrder: (document: SubstraitDocument) => apply(document).outcome !== 'rejected',
    cancel: state.reset,
    joinDraft: state.joinDraft,
    operation: state.operation,
    selectedInputIds: state.slots.selectedInputIds,
    setJoinDraft: (draft: SubstraitDocument) => {
      if (start()) state.setJoinDraft(draft);
    },
    start,
    positions: state.positions,
    setPositions: state.setPositions,
    hasIncompleteGraph,
    hasDraftChanges,
  } as const;
}
