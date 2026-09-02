/** Owned concern: bind inline column comments to the canonical Inspector mutation rail. */
import { useCallback, type ReactNode } from 'react';

import type { NodePropertyTableCellRenderContext } from '../../components/inspector/NodePropertySectionView';
import type { CanvasViewCopy } from './copy';
import type { CanvasInspectorAuthoringContract } from './canvasInspectorAuthoring.types';
import { CanvasColumnCommentEditor } from './CanvasColumnCommentEditor';
import { setDvtSubstraitFieldDescription } from './canvasDvtSubstraitFieldDocumentation';
import type { CanvasNodeWorkbenchDraftController } from './useCanvasNodeWorkbenchDraftController';

export function useCanvasColumnCommentCellRenderer(args: {
  copy: CanvasViewCopy;
  authoring: CanvasInspectorAuthoringContract;
  draftController: CanvasNodeWorkbenchDraftController;
}): (context: NodePropertyTableCellRenderContext) => ReactNode {
  const commit = useCallback(
    (fieldId: string, description: string) => {
      const currentDraft = args.draftController.draft;
      if (
        currentDraft.dvt?.kind !== 'transform' ||
        currentDraft.dvt.mode !== 'substrait' ||
        currentDraft.dvt.shape !== 'projection'
      ) {
        return;
      }
      const dvt = setDvtSubstraitFieldDescription({
        metadata: currentDraft.dvt,
        fieldId,
        description,
      });
      if (dvt === currentDraft.dvt) return;
      const nextDraft = { ...currentDraft, dvt };
      args.draftController.onDraftChange(nextDraft);
      args.authoring.onApplyNodeDraft(nextDraft);
      args.draftController.onDraftSubmitted(nextDraft);
    },
    [args.authoring, args.draftController]
  );

  return useCallback(
    (context) => {
      const dvt = args.draftController.draft.dvt;
      if (
        context.sectionId !== 'columns' ||
        context.columnKey !== 'comment' ||
        dvt?.kind !== 'transform' ||
        dvt.mode !== 'substrait' ||
        dvt.shape !== 'projection'
      ) {
        return undefined;
      }
      const field = dvt.sidecar.fields.find((candidate) => candidate.fieldId === context.rowId);
      if (field == null) return undefined;
      return (
        <CanvasColumnCommentEditor
          fieldName={field.displayName ?? context.rowId}
          value={field.description ?? ''}
          disabled={!args.authoring.canEditNode}
          label={args.copy.inspectorColumnCommentLabel}
          placeholder={args.copy.inspectorColumnCommentPlaceholder}
          onCommit={(value) => commit(field.fieldId, value)}
        />
      );
    },
    [args.authoring.canEditNode, args.copy, args.draftController.draft.dvt, commit]
  );
}
