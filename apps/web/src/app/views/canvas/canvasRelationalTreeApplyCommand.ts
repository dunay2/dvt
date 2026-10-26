/** Apply persists the edited document without reconstructing or changing its identities. */
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import { createCanvasRelationalTreeApplyDraft } from './canvasRelationalTreeApplyDraft';
import type {
  CanvasInspectorNodeDraft,
  CanvasInspectorNodeDraftInputChanges,
} from './canvasInspectorAuthoring.types';
import type {
  CanvasRelationalTreeApplyResult,
  CanvasRelationalTreeApplyCommandArgs,
  CanvasRelationalTreeApplyCommandFactory,
} from './canvasRelationalTreeWorkbench.types';

export const createCanvasRelationalTreeApplyCommand = ((
  args: CanvasRelationalTreeApplyCommandArgs
) => {
  return (
    document?: SubstraitDocument,
    inputChanges: CanvasInspectorNodeDraftInputChanges | undefined = args.inputChanges
  ): CanvasRelationalTreeApplyResult | Promise<CanvasRelationalTreeApplyResult> => {
    const joinDraft = document ?? args.joinDraft;
    const { authoring, editable, operation, reject, reset, transformNode } = args;
    if (
      !editable ||
      (args.relationalAuthoringDraft === undefined &&
        !args.cleared &&
        (operation == null || joinDraft == null)) ||
      authoring == null
    ) {
      const rejection = { outcome: 'rejected', reason: 'command_unavailable' } as const;
      reject(rejection);
      return rejection;
    }
    const draft = createCanvasRelationalTreeApplyDraft({
      transformNode,
      operation,
      joinDraft,
      relationalAuthoringDraft: args.relationalAuthoringDraft,
    });
    const settle = (result: CanvasRelationalTreeApplyResult): CanvasRelationalTreeApplyResult => {
      if (inputChanges?.signal?.aborted)
        return { outcome: 'rejected', reason: 'command_unavailable' };
      if (result.outcome === 'rejected') reject(result);
      else if (args.relationalAuthoringDraft == null) reset();
      return result;
    };
    const request: [string, CanvasInspectorNodeDraft, CanvasInspectorNodeDraftInputChanges?] =
      inputChanges == null ? [transformNode.id, draft] : [transformNode.id, draft, inputChanges];
    const result = authoring.onApplyNodeDraft(...request);
    return result instanceof Promise
      ? result.then(settle, () => settle({ outcome: 'rejected', reason: 'invalid_draft' }))
      : settle(result);
  };
}) as CanvasRelationalTreeApplyCommandFactory;
