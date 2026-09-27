/** Apply persists the edited document without reconstructing or changing its identities. */
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import type { DvtRelationalAuthoringDraftV1 } from '@dvt/contracts';
import type { CanonicalNode } from '../../types/canonical';
import type { CanvasRelationalOperation } from './canvasRelationalOperationChoices';
import { createCanvasRelationalTreeNodeDraft } from './canvasRelationalTreeAuthoringModel';
import { createCanvasInspectorNodeDraft } from './canvasInspectorAuthoringModel';
import type {
  CanvasRelationalTreeApplyResult,
  CanvasRelationalTreeAuthoringContract,
  RelationalApplyRejection,
} from './canvasRelationalTreeWorkbench.types';

export function useCanvasRelationalTreeApplyCommand(args: {
  authoring?: CanvasRelationalTreeAuthoringContract;
  editable: boolean;
  relationalAuthoringDraft?: DvtRelationalAuthoringDraftV1;
  cleared?: boolean;
  joinDraft: SubstraitDocument | null;
  operation: CanvasRelationalOperation | null;
  reject: (rejection: RelationalApplyRejection) => void;
  reset: () => void;
  transformNode: CanonicalNode;
}) {
  return (joinDraft = args.joinDraft): CanvasRelationalTreeApplyResult => {
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
    const semanticDraft =
      operation == null || joinDraft == null
        ? createCanvasInspectorNodeDraft(transformNode)
        : createCanvasRelationalTreeNodeDraft(transformNode, operation, joinDraft);
    const draft = {
      ...semanticDraft,
      relationalAuthoringDraft:
        args.relationalAuthoringDraft === undefined ? null : args.relationalAuthoringDraft,
    };
    const result = authoring.onApplyNodeDraft(transformNode.id, draft);
    if (result.outcome === 'rejected') reject(result);
    else if (args.relationalAuthoringDraft === undefined) reset();
    return result;
  };
}
