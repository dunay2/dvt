/** Owned concern: coordinate one discardable guided relation-authoring session. */
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import type { CanvasRelationalOperation } from './canvasRelationalOperationChoices';
import type { CanvasRelationalTreeAuthoringContract } from './canvasRelationalTreeWorkbench.types';
import {
  appendCanvasRelationalTreeJoinInput,
  createCanvasRelationalTreeInitialJoinDraft,
  resolveCanvasRelationalTreeAuthoringCandidates,
  resolveCanvasRelationalTreeAuthoringChoices,
} from './canvasRelationalTreeAuthoringModel';
import type { DvtSubstraitInnerJoinDraft } from './canvasDvtSubstraitJoinComposition';
import { useCanvasRelationalTreeApplyCommand } from './useCanvasRelationalTreeApplyCommand';

type AppendJoinSelection = Readonly<{
  leftSourceFieldId: string;
  rightFieldName: string;
}>;

export function useCanvasRelationalTreeAuthoringSession(
  args: Readonly<{
    enabled: boolean;
    transformNode: CanonicalNode;
    nodes: readonly CanonicalNode[];
    edges: readonly CanonicalEdge[];
    inputs: readonly CanvasDvtCompositionInput[];
    authoring?: CanvasRelationalTreeAuthoringContract;
  }>
) {
  const { authoring, edges, enabled, inputs, nodes, transformNode } = args;
  const editable = authoring?.canEditNode === true;
  const targetNodeId = transformNode.id;
  const [firstInputId, setFirstInputId] = useState<string | null>(null);
  const [operation, setOperation] = useState<CanvasRelationalOperation | null>(null);
  const [selectedInputIds, setSelectedInputIds] = useState<readonly string[]>([]);
  const [joinDraft, setJoinDraft] = useState<DvtSubstraitInnerJoinDraft | null>(null);
  const [appendInputId, setAppendInputId] = useState<string | null>(null);

  const reset = useCallback(() => {
    setFirstInputId(null);
    setOperation(null);
    setSelectedInputIds([]);
    setJoinDraft(null);
    setAppendInputId(null);
  }, []);

  useEffect(reset, [enabled, reset, targetNodeId]);

  const choices = useMemo(
    () =>
      !enabled || firstInputId == null
        ? []
        : resolveCanvasRelationalTreeAuthoringChoices({
            edges,
            firstInputId,
            inputs,
            nodes,
            readOnly: !editable,
            targetNodeId,
          }),
    [editable, edges, enabled, firstInputId, inputs, nodes, targetNodeId]
  );
  const candidates = useMemo(
    () =>
      !enabled || operation == null
        ? []
        : resolveCanvasRelationalTreeAuthoringCandidates({
            edges,
            inputs,
            operation,
            nodes,
            selectedInputIds,
            joinDraft,
            targetNodeId,
          }),
    [edges, enabled, inputs, joinDraft, nodes, operation, selectedInputIds, targetNodeId]
  );

  const selectInput = useCallback(
    (nodeId: string) => {
      if (!enabled || !editable) return;
      if (firstInputId == null || operation == null) {
        setFirstInputId(nodeId);
        setSelectedInputIds([nodeId]);
        setOperation(null);
        setJoinDraft(null);
        setAppendInputId(null);
        return;
      }
      const candidate = candidates.find((item) => item.nodeId === nodeId);
      if (candidate?.selectable !== true) return;
      if (operation === 'union_all') {
        setSelectedInputIds((current) => [...current, nodeId]);
        return;
      }
      if (joinDraft == null) {
        const draft = createCanvasRelationalTreeInitialJoinDraft({
          inputs,
          targetNodeId,
          leftInputId: firstInputId,
          rightInputId: nodeId,
        });
        if (draft == null) return;
        setJoinDraft(draft);
        setSelectedInputIds([firstInputId, nodeId]);
        return;
      }
      setAppendInputId(nodeId);
    },
    [candidates, editable, enabled, firstInputId, inputs, joinDraft, operation, targetNodeId]
  );

  const selectOperation = useCallback(
    (nextOperation: CanvasRelationalOperation) => {
      if (!choices.some((choice) => choice.operation === nextOperation && choice.selectable))
        return;
      setOperation(nextOperation);
      setSelectedInputIds(firstInputId == null ? [] : [firstInputId]);
      setJoinDraft(null);
      setAppendInputId(null);
    },
    [choices, firstInputId]
  );

  const appendJoinInput = useCallback(
    (selection: AppendJoinSelection) => {
      const input = inputs.find((candidate) => candidate.nodeId === appendInputId);
      if (input == null || joinDraft == null) return;
      const next = appendCanvasRelationalTreeJoinInput({ draft: joinDraft, input, ...selection });
      if (next === joinDraft) return;
      setJoinDraft(next);
      setSelectedInputIds((current) => [...current, input.nodeId]);
      setAppendInputId(null);
    },
    [appendInputId, inputs, joinDraft]
  );

  const apply = useCanvasRelationalTreeApplyCommand({
    authoring,
    editable,
    edges,
    joinDraft,
    nodes,
    operation,
    reset,
    selectedInputIds,
    transformNode,
  });

  return {
    appendInput: inputs.find((input) => input.nodeId === appendInputId) ?? null,
    apply,
    appendJoinInput,
    cancel: reset,
    candidates,
    choices,
    firstInputId,
    joinDraft,
    operation,
    selectedInputIds,
    selectInput,
    selectOperation,
    setJoinDraft,
  } as const;
}
