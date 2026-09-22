/** Bind a card to the existing selected-relation query without selecting or editing it. */
import { useContext } from 'react';
import { CanvasOperationPreviewContext } from './CanvasOperationDataPreview';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';
import { resolveCanvasViewCopy } from './canvasCopyCatalog';
import { resolveCanvasRelationalNodePresentation } from './canvasRelationalNodePresentation';
import type { CanvasRelationalTreeNode } from './canvasRelationalTreeProjection';

export function useCanvasRelationalOperationExecution(node: CanvasRelationalTreeNode) {
  const context = useContext(CanvasOperationPreviewContext);
  const language = useApplicationLanguageStore((state) => state.language);
  const copy = resolveCanvasSemanticEditorCopy(language);
  if (context == null || node.relationId == null || node.operator === 'unsupported') return null;
  const { presentation } = resolveCanvasRelationalNodePresentation(node);
  const label =
    node.operator === 'read'
      ? (node.displayName ?? copy.data)
      : resolveCanvasViewCopy(language)[presentation.labelKey];
  const disabled =
    context.unapplied ||
    context.query == null ||
    context.semanticDigest == null ||
    (context.canEditModel && context.preparePreview == null) ||
    (context.dataHost == null && context.onOpenData == null);
  return {
    label: copy.execute,
    disabled,
    title: context.unapplied
      ? copy.operationPreviewUnapplied
      : disabled
        ? copy.unavailable
        : copy.execute,
    onExecute: () => {
      if (!disabled) context.execute(node.relationId!, label);
    },
  };
}
