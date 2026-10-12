/** Bind a card to the existing selected-relation query without selecting or editing it. */
import { useContext } from 'react';
import { CanvasOperationPreviewContext } from './CanvasOperationDataPreview';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';
import { resolveCanvasViewCopy } from './canvasCopyCatalog';
import { resolveCanvasRelationalNodePresentation } from './canvasRelationalNodePresentation';
import type { CanvasRelationalTreeNode } from './canvasRelationalTreeProjection';
import { resolveCanvasConnectedSourceDataSampleTarget } from './canvasSourceDataSample';

export function useCanvasRelationalOperationExecution(node: CanvasRelationalTreeNode) {
  const context = useContext(CanvasOperationPreviewContext);
  const language = useApplicationLanguageStore((state) => state.language);
  const copy = resolveCanvasSemanticEditorCopy(language);
  if (node.relationId == null) return null;
  if (context == null || node.operator === 'unsupported')
    return {
      label: copy.previewAction,
      disabled: true,
      title: copy.unavailable,
      onExecute: () => undefined,
    };
  if (node.operator === 'read') {
    const target = resolveCanvasConnectedSourceDataSampleTarget(
      node.sourceRef,
      node.displayName ?? copy.data
    );
    const selectedFieldNames = context.sourceOutputFieldsByRelationId?.get(node.relationId);
    const disabled =
      target == null ||
      context.onExecuteSource == null ||
      selectedFieldNames == null ||
      selectedFieldNames.length === 0;
    return {
      label: copy.previewAction,
      disabled,
      title: disabled ? copy.unavailable : copy.previewAction,
      onExecute: () => {
        if (!disabled && target != null && selectedFieldNames != null)
          context.onExecuteSource?.(
            `${context.nodeId}:${node.relationId}`,
            target,
            selectedFieldNames
          );
      },
    };
  }
  if (!context.outputPlanRelationIds.has(node.relationId)) {
    return {
      label: copy.previewAction,
      disabled: true,
      title: copy.operationPreviewOutsideOutputPlan,
      disabledReason: copy.operationPreviewOutsideOutputPlan,
      onExecute: () => undefined,
    };
  }
  const { presentation } = resolveCanvasRelationalNodePresentation(node);
  const label = resolveCanvasViewCopy(language)[presentation.labelKey];
  const disabled =
    context.unapplied ||
    context.unavailableRelationIds?.has(node.relationId) === true ||
    context.query == null ||
    context.semanticDigest == null ||
    (context.canEditModel && context.preparePreview == null) ||
    (context.dataHost == null && context.onOpenData == null);
  return {
    label: copy.previewAction,
    disabled,
    title: context.unapplied
      ? copy.operationPreviewUnapplied
      : disabled
        ? copy.unavailable
        : copy.previewAction,
    onExecute: () => {
      if (!disabled) context.execute(node.relationId!, label);
    },
  };
}
