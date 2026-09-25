/** Connect explicit UI intent to revision-bound composition commands, never to hydration side effects. */
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import { useEffect, useState } from 'react';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import type {
  CanvasRelationalOperation,
  CanvasRelationalOperationChoice,
} from './canvasRelationalOperationChoices';
import type { useCanvasRelationAnalysisSession } from './useCanvasRelationAnalysisSession';
import { useRelationCommand } from './useRelationCommand';
import { composeSourceRelation } from './canvasComposeSourceRelation';
import { replaceSelectedComposition } from './canvasReplaceSelectedComposition';
import { createCanvasRelationalTreeOperationDraft } from './canvasRelationalTreeOperationDraft';
import { isCanvasJoinOperation } from './canvasRelationalTreeJoinType';

export function useCanvasRelationComposition(
  args: Readonly<{
    analysis: ReturnType<typeof useCanvasRelationAnalysisSession>;
    appendInputId: string | null;
    choices: readonly CanvasRelationalOperationChoice[];
    inputs: readonly CanvasDvtCompositionInput[];
    draft: SubstraitDocument | null;
    operation: CanvasRelationalOperation | null;
    selectedInputIds: readonly string[];
    targetNodeId: string;
    appendOperand: (nodeId: string) => void;
    setAppendInputId: (nodeId: string | null) => void;
    setDraft: (draft: SubstraitDocument) => void;
    setOperation: (operation: CanvasRelationalOperation | null) => void;
  }>
) {
  const rootId =
    args.analysis?.error == null && args.analysis?.document != null
      ? args.analysis.session.rootId
      : '';
  const command = useRelationCommand(rootId, args.setDraft, args.analysis);
  const [initialError, setInitialError] = useState(false);
  useEffect(() => setInitialError(false), [args.targetNodeId, args.draft, args.selectedInputIds]);
  const append = async (
    nodeId: string,
    operation: CanvasRelationalOperation,
    predicate?: Readonly<{ leftSourceFieldId: string; rightFieldName: string }>
  ) => {
    const input = args.inputs.find((candidate) => candidate.nodeId === nodeId);
    if (input == null) return false;
    const accepted = await command.execute((session, target) =>
      composeSourceRelation(session, { ...target, input, operation, predicate })
    );
    if (accepted) {
      args.appendOperand(nodeId);
      args.setOperation(operation);
      args.setAppendInputId(null);
    }
    return accepted;
  };
  const requestAppend = (nodeId: string) => {
    const operation = args.operation;
    if (operation == null || operation === 'projection' || isCanvasJoinOperation(operation))
      args.setAppendInputId(nodeId);
    else void append(nodeId, operation);
  };
  const selectOperation = async (operation: CanvasRelationalOperation, relationId?: string) => {
    if (
      (args.draft == null || args.appendInputId != null) &&
      !args.choices.some((choice) => choice.operation === operation && choice.selectable)
    )
      return;
    if (args.draft == null) {
      try {
        const document = createCanvasRelationalTreeOperationDraft({ ...args, operation });
        setInitialError(document == null);
        if (document != null) {
          args.setDraft(document);
          args.setOperation(operation);
        }
      } catch {
        setInitialError(true);
      }
      return;
    }
    if (args.appendInputId != null) {
      if (isCanvasJoinOperation(operation)) args.setOperation(operation);
      else await append(args.appendInputId, operation);
      return;
    }
    if (relationId == null) return;
    const accepted = await command.execute((session, target) =>
      replaceSelectedComposition(session, { ...target, relationId, operation })
    );
    if (accepted) args.setOperation(operation);
  };
  return {
    commandState: initialError ? 'error' : command.state,
    selectOperation,
    requestAppend,
    appendJoinInput: (
      predicate: Readonly<{ leftSourceFieldId: string; rightFieldName: string }>
    ) => {
      if (args.appendInputId != null && isCanvasJoinOperation(args.operation))
        void append(args.appendInputId, args.operation, predicate);
    },
  };
}
