/** Owned concern: validate inspector edits and submit through the existing authoring port. */
import { useMemo } from 'react';
import {
  hasCanvasInspectorNodeDraftChanges,
  validateCanvasInspectorNodeDraft,
  type CanvasInspectorNodeDraftValidationContext,
} from './canvasInspectorAuthoringModel';
import type { CanvasInspectorAuthoringContract } from './canvasInspectorAuthoring.types';
import type { CanvasNodeWorkbenchDraftController } from './useCanvasNodeWorkbenchDraftController';
import { isDbtCompatibleModel } from './canvasDbtAuthoringModel';

export function useCanvasInspectorDraftSubmission({
  node,
  nodes,
  edges,
  authoring,
  draftController,
}: Omit<CanvasInspectorNodeDraftValidationContext, 'workspaceScope'> &
  Readonly<{
    authoring: CanvasInspectorAuthoringContract;
    draftController: CanvasNodeWorkbenchDraftController;
  }>) {
  const { draft } = draftController;
  const context = useMemo(
    () => ({ node, nodes, edges, workspaceScope: authoring.workspaceScope }),
    [node, nodes, edges, authoring.workspaceScope]
  );
  const errors = useMemo(() => validateCanvasInspectorNodeDraft(draft, context), [draft, context]);
  const isDirty = useMemo(() => hasCanvasInspectorNodeDraftChanges(node, draft), [draft, node]);
  const canApply = authoring.canEditNode && isDirty && Object.keys(errors).length === 0;
  const commitDbtModelDraft = (nextDraft: typeof draft): void => {
    draftController.onDraftChange(nextDraft);
    const nextErrors = validateCanvasInspectorNodeDraft(nextDraft, context);
    if (!authoring.canEditNode || Object.keys(nextErrors).length > 0) return;
    authoring.onApplyNodeDraft(nextDraft);
    draftController.onDraftSubmitted(nextDraft);
  };
  return {
    errors,
    isDirty,
    canApply,
    commitDbtModelDraft,
    commitCurrentDbtModelDraft: () => {
      if (isDbtCompatibleModel(node)) commitDbtModelDraft(draft);
    },
    applyDraft: () => {
      if (!canApply) return;
      authoring.onApplyNodeDraft(draft);
      draftController.onDraftSubmitted(draft);
    },
  };
}
