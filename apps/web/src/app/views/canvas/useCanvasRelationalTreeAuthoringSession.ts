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
import { useCanvasRelationalTreeInputSelection } from './useCanvasRelationalTreeInputSelection';
import { createSourceOccurrenceActions } from './relational-source-occurrence/sourceOccurrenceActions';
import type { CanvasRelationalTreeProjection } from './canvasRelationalTreeProjection';
import { useCanvasRelationAnalysisSession } from './useCanvasRelationAnalysisSession';
import { useCanvasRelationFields } from './useCanvasRelationFields';
import type { SubstraitDocument } from '@dvt/substrait-analysis';
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
  const {
    slots,
    operation,
    setOperation,
    active,
    setActive,
    joinDraft,
    setJoinDraft,
    appendInputId,
    setAppendInputId,
    applyRejection,
    setApplyRejection,
    reset,
    hydrate: hydrateExistingState,
  } = useCanvasRelationalTreeDraftState();
  const {
    appendInput: appendOperand,
    placeInput: placeOperand,
    primaryInputId,
    secondaryInputId,
    selectedInputIds,
    selectInitialInput,
  } = slots;
  const { hydrateExisting, baselineDraft, seed } = useCanvasRelationalTreeExistingSeed({
    document: args.document,
    projection: args.projection,
    onHydrate: hydrateExistingState,
  });
  useEffect(reset, [enabled, reset, transformNode.id]);
  const effectiveDraft = !active && seed != null ? seed.draft : joinDraft;
  const analysis = useCanvasRelationAnalysisSession(effectiveDraft, transformNode.id);
  const output = useCanvasRelationFields(null, analysis).result;
  const effectiveInputIds = !active && seed != null ? seed.inputIds : selectedInputIds;
  const { candidates, choices } = useCanvasRelationalTreeAuthoringOptions({
    appendInputId,
    editable,
    edges,
    enabled,
    inputs,
    output,
    session: analysis?.session ?? null,
    revision: analysis?.revision ?? 0,
    nodes,
    operation: !active && seed != null ? seed.operation : operation,
    selectedInputIds: effectiveInputIds,
    targetNodeId: transformNode.id,
  });
  const composition = useCanvasRelationComposition({
    analysis,
    appendInputId,
    choices,
    inputs,
    draft: effectiveDraft,
    operation: !active && seed != null ? seed.operation : operation,
    selectedInputIds: effectiveInputIds,
    targetNodeId: transformNode.id,
    appendOperand,
    setAppendInputId,
    setDraft: setJoinDraft,
    setOperation,
  });
  const apply = useCanvasRelationalTreeApplyCommand({
    authoring,
    editable,
    joinDraft,
    operation: !active && seed != null ? seed.operation : operation,
    reject: setApplyRejection,
    reset,
    transformNode,
  });
  const start = useCallback(() => {
    if (!enabled || !editable) return false;
    if (!active && !hydrateExisting()) setActive(true);
    return true;
  }, [active, editable, enabled, hydrateExisting]);
  const { selectInput, placeInput } = useCanvasRelationalTreeInputSelection({
    enabled,
    editable,
    active,
    operation,
    candidates,
    inputs,
    start,
    hasDraft: effectiveDraft != null,
    selectInitialInput,
    placeOperand,
    requestAppend: composition.requestAppend,
  });
  const removal = useCanvasRelationalTreeRemoval({
    analysis,
    enabled: enabled && editable,
    active,
    draft: joinDraft,
    selectedInputIds,
    seed,
    hydrate: hydrateExisting,
    accept: (result, ids) =>
      hydrateExistingState({ ...result, inputIds: ids, appendInputId: null }),
  });
  return {
    analysis,
    occurrences: createSourceOccurrenceActions({
      editable: enabled && editable,
      output,
      session: analysis?.session ?? null,
      revision: analysis?.revision ?? 0,
      operation: !active && seed != null ? seed.operation : operation,
      inputs,
      start,
      setAppendInputId: composition.requestAppend,
    }),
    removal,
    applyRejection,
    active,
    baselineDraft,
    seed,
    appendInput: inputs.find((input) => input.nodeId === appendInputId) ?? null,
    apply,
    applyOutputOrder: (document: SubstraitDocument) => apply(document).outcome !== 'rejected',
    appendJoinInput: composition.appendJoinInput,
    commandState: composition.commandState,
    cancel: reset,
    candidates,
    choices,
    joinDraft,
    operation,
    placeInput,
    primaryInputId,
    secondaryInputId,
    selectedInputIds,
    selectInput,
    selectOperation: (next: CanvasRelationalOperation, relationId?: string) => {
      if (start()) void composition.selectOperation(next, relationId);
    },
    setJoinDraft: (draft: SubstraitDocument) => {
      if (!active) hydrateExisting();
      setJoinDraft(draft);
    },
    start,
  } as const;
}
