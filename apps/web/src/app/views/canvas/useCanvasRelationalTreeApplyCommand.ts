/** Apply persists the edited document without reconstructing or changing its identities. */
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import type { CanonicalNode } from '../../types/canonical';
import type { CanvasRelationalOperation } from './canvasRelationalOperationChoices';
import { createCanvasRelationalTreeNodeDraft } from './canvasRelationalTreeAuthoringModel';
import type {
  CanvasRelationalTreeApplyResult,
  CanvasRelationalTreeAuthoringContract,
  RelationalApplyRejection,
} from './canvasRelationalTreeWorkbench.types';

export function useCanvasRelationalTreeApplyCommand(args: {
  authoring?: CanvasRelationalTreeAuthoringContract;
  editable: boolean;
  joinDraft: SubstraitDocument | null;
  operation: CanvasRelationalOperation | null;
  reject: (rejection: RelationalApplyRejection) => void;
  reset: () => void;
  transformNode: CanonicalNode;
}) {
  return (joinDraft = args.joinDraft): CanvasRelationalTreeApplyResult => {
    const { authoring, editable, operation, reject, reset, transformNode } = args;
    if (!editable || operation == null || joinDraft == null || authoring == null) {
      const rejection = { outcome: 'rejected', reason: 'command_unavailable' } as const;
      reject(rejection);
      return rejection;
    }
    const result = authoring.onApplyNodeDraft(
      transformNode.id,
      createCanvasRelationalTreeNodeDraft(transformNode, operation, joinDraft)
    );
    if (result.outcome === 'rejected') reject(result);
    else reset();
    return result;
  };
}
