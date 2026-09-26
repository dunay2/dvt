/** Owned concern: coordinate one discardable guided relation-authoring session. */
import { useCallback, useEffect } from 'react';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import type { CanvasRelationalOperation } from './canvasRelationalOperationChoices';
import type * as W from './canvasRelationalTreeWorkbench.types';
import { useCanvasRelationalTreeApplyCommand } from './useCanvasRelationalTreeApplyCommand';
import { useCanvasRelationalTreeDraftState } from './useCanvasRelationalTreeDraftState';
import { useCanvasRelationalTreeAuthoringOptions } from './useCanvasRelationalTreeAuthoringOptions';
import { useCanvasRelationalTreeExistingSeed } from './useCanvasRelationalTreeExistingSeed';
import { useCanvasRelationComposition } from './useCanvasRelationComposition';
import { useCanvasRelationalTreeRemoval } from './useCanvasRelationalTreeRemoval';
import { createSourceOccurrenceActions } from './relational-source-occurrence/sourceOccurrenceActions';
import type { CanvasRelationalTreeProjection } from './canvasRelationalTreeProjection';
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import { useRelationCommand } from './useRelationCommand';
import { useCanvasStagedOperationSession } from './useCanvasStagedOperationSession';
import { useCanvasRelationalTreeAnalysisContext } from './useCanvasRelationalTreeAnalysisContext';
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
  useEffect(state.reset, [enabled, state.reset, transformNode.id]);
  const effectiveDraft = !state.active && seed != null ? seed.draft : state.joinDraft;
  const { analysis, output } = useCanvasRelationalTreeAnalysisContext({
    document: effectiveDraft,
    transformNode,
    nodes,
    edges,
  });
  const stagedCommand = useRelationCommand('', state.setJoinDraft, analysis);
  const effectiveInputIds =
    !state.active && seed != null ? seed.inputIds : state.slots.selectedInputIds;
  const { candidates, choices } = useCanvasRelationalTreeAuthoringOptions({
    appendInputId: state.appendInputId,
    editable,
    edges,
    enabled,
    inputs,
    output,
    session: analysis?.session ?? null,
    revision: analysis?.revision ?? 0,
    nodes,
    operation: !state.active && seed != null ? seed.operation : state.operation,
    selectedInputIds: effectiveInputIds,
    targetNodeId: transformNode.id,
  });
  const composition = useCanvasRelationComposition({
    pendingSource: state.pendingSource,
    onSourceConsumed: state.consumePendingSource,
    analysis,
    appendInputId: state.appendInputId,
    appendTargetRelationId: state.appendTargetRelationId,
    choices,
    inputs,
    draft: effectiveDraft,
    operation: !state.active && seed != null ? seed.operation : state.operation,
    selectedInputIds: effectiveInputIds,
    targetNodeId: transformNode.id,
    appendOperand: state.slots.appendInput,
    setAppendInputId: state.setAppendInputId,
    setAppendTargetRelationId: state.setAppendTargetRelationId,
    setDraft: state.setJoinDraft,
    setOperation: state.setOperation,
  });
  const cleared =
    state.active &&
    state.joinDraft == null &&
    state.operation == null &&
    state.slots.selectedInputIds.length === 0;
  const apply = useCanvasRelationalTreeApplyCommand({
    cleared,
    hasPendingSources: state.pendingSources.length > 0,
    authoring,
    editable,
    joinDraft: state.joinDraft,
    operation: !state.active && seed != null ? seed.operation : state.operation,
    reject: state.setApplyRejection,
    reset: state.reset,
    transformNode,
  });
  const start = useCallback(() => {
    if (!enabled || !editable) return false;
    if (!state.active && !hydrateExisting()) state.setActive(true);
    return true;
  }, [state.active, state.setActive, editable, enabled, hydrateExisting]);
  const staged = useCanvasStagedOperationSession({
    editable: enabled && editable,
    start,
    targetNodeId: transformNode.id,
    inputs,
    pendingSources: state.pendingSources,
    analysis,
    composition,
    command: stagedCommand,
    state,
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
    occurrences: createSourceOccurrenceActions({
      editable: enabled && editable,
      session: analysis?.document == null ? null : analysis.session,
      revision: analysis?.revision ?? 0,
      inputs,
      start,
      setAppendInputId: state.setAppendInputId,
      pending: state.pendingSources,
      setPending: state.setPendingSources,
      selectedId: state.pendingSourceId,
      setSelectedId: state.setPendingSourceId,
      selectInitialInput: (id) => state.slots.replaceInputs([id]),
    }),
    staged,
    removal,
    cleared,
    applyRejection: state.applyRejection,
    active: state.active,
    baselineDraft,
    seed,
    appendInput: inputs.find((input) => input.nodeId === state.appendInputId) ?? null,
    apply: () => apply(),
    applyOutputOrder: (document: SubstraitDocument) => apply(document).outcome !== 'rejected',
    appendJoinInput: composition.appendJoinInput,
    commandState: composition.commandState,
    cancel: state.reset,
    candidates,
    choices,
    joinDraft: state.joinDraft,
    operation: state.operation,
    selectedInputIds: state.slots.selectedInputIds,
    selectOperation: (next: CanvasRelationalOperation, relationId?: string) => {
      if (start()) void composition.selectOperation(next, relationId);
    },
    setJoinDraft: (draft: SubstraitDocument) => {
      if (start()) state.setJoinDraft(draft);
    },
    start,
  } as const;
}
