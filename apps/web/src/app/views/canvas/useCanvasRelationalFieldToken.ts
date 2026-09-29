/** Adapt one field token's gestures to the existing selection and connection commands. */
import { useContext, type DragEvent, type KeyboardEvent } from 'react';
import type { SemanticWorkbenchNodeData } from './semanticWorkbenchProjection';
import { CanvasRelationAnalysisContext } from './CanvasRelationAnalysisContext';
import { useCanvasRelationalFieldSelection } from './CanvasRelationalFieldSelectionProvider';
import {
  CANVAS_RELATIONAL_FIELD_DRAG_TYPE,
  readCanvasRelationalFieldDrag,
  writeCanvasRelationalFieldDrag,
  type CanvasRelationalFieldReference,
} from './canvasRelationalTreeDrag';

export type StagedFieldScope = Readonly<{ rootId: string; producerPlanSha256: string }>;

export function useCanvasRelationalFieldToken(
  data: SemanticWorkbenchNodeData,
  relationId: string,
  stagedFieldScope?: StagedFieldScope
) {
  const analysis = useContext(CanvasRelationAnalysisContext);
  const actions = useCanvasRelationalFieldSelection();
  const reference = ((): CanvasRelationalFieldReference | null => {
    if (data.fieldReference == null) return null;
    if (stagedFieldScope != null) {
      if (data.fieldReference.relationId !== stagedFieldScope.rootId) return null;
      return {
        ...data.fieldReference,
        rootId: stagedFieldScope.rootId,
        revision: 0,
        selectedOutput: false,
        producerPlanSha256: stagedFieldScope.producerPlanSha256,
      };
    }
    if (analysis?.document == null || analysis.error != null) return null;
    return {
      ...data.fieldReference,
      rootId: analysis.session.rootId,
      revision: analysis.revision,
      selectedOutput: data.fieldSelection === 'output',
    };
  })();
  const expression = data.projectExpressionOrdinal != null;
  const interactive =
    stagedFieldScope == null &&
    actions?.enabled === true &&
    (expression || (reference != null && data.fieldSelection != null));
  const keyboardShortcut = !interactive
    ? undefined
    : expression || data.fieldSelection === 'output'
      ? 'Delete'
      : 'Enter';
  const removeExpression = () => {
    if (reference?.selectedOutput) actions?.remove(reference);
    else if (data.projectExpressionOrdinal != null)
      actions?.removeExpression(relationId, data.projectExpressionOrdinal);
  };
  const onDragStart = (event: DragEvent<HTMLSpanElement>) => {
    event.stopPropagation();
    if (reference == null) {
      event.preventDefault();
      return;
    }
    writeCanvasRelationalFieldDrag(event.dataTransfer, reference);
    actions?.begin(reference);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    if (event.key === 'Escape') {
      actions?.end();
      return;
    }
    if (!interactive) return;
    if (expression && event.key === 'Delete') {
      event.preventDefault();
      event.stopPropagation();
      removeExpression();
    } else if (reference != null && data.fieldSelection === 'output' && event.key === 'Delete') {
      event.preventDefault();
      event.stopPropagation();
      actions.remove(reference);
    } else if (reference != null && data.fieldSelection === 'input' && event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      actions.add(reference, relationId);
    }
  };
  const onDragOver = (event: DragEvent<HTMLSpanElement>) => {
    if (!event.dataTransfer.types.includes(CANVAS_RELATIONAL_FIELD_DRAG_TYPE)) return;
    event.stopPropagation();
    if (actions?.enabled && data.fieldTargetRelationId != null) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
    }
  };
  const onDrop = (event: DragEvent<HTMLSpanElement>) => {
    if (!event.dataTransfer.types.includes(CANVAS_RELATIONAL_FIELD_DRAG_TYPE)) return;
    event.preventDefault();
    event.stopPropagation();
    const source = readCanvasRelationalFieldDrag(event.dataTransfer);
    actions?.end();
    if (actions?.enabled && data.fieldTargetRelationId != null && source != null)
      actions.add(source, data.fieldTargetRelationId);
  };
  return {
    reference,
    interactive,
    keyboardShortcut,
    showRemove: expression && actions != null,
    removeExpression,
    onDragStart,
    onDragEnd: () => actions?.end(),
    onKeyDown,
    onDragOver,
    onDrop,
  };
}
