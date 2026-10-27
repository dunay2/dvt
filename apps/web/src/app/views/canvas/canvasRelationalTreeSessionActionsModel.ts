/**
 * Owned concern: project the current edit transaction into passive session-action presentation.
 * @baseline GH-3629: command admission and navigation remain with their existing owners.
 * @decision Derive labels, rejection copy and control posture from one explicit snapshot.
 * @consequence Rendering has no transaction authority or temporal state machine.
 */
import type {
  CanvasRelationalTreeApplyResult,
  CanvasRelationalTreeWorkbenchCopy,
  RelationalApplyRejection,
} from './canvasRelationalTreeWorkbench.types';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';
import { formatCanvasModelOutputDependencyRejection } from './canvasCopyFormatting';

type CanvasRelationalTreeSessionActionsState = Readonly<{
  active: boolean;
  canApply: boolean;
  hasUnappliedChanges: boolean;
  applyRejection: RelationalApplyRejection | null;
  pendingNavigation: boolean;
}>;

export type CanvasRelationalTreeSessionActionsBinding = Readonly<{
  onApply: () => CanvasRelationalTreeApplyResult | Promise<CanvasRelationalTreeApplyResult>;
  onCancel: () => void;
  onStay: () => void;
  onDiscard: () => void;
  onApplyAndNavigate: () => void;
}>;

export type CanvasRelationalTreeSessionActionsModel =
  | Readonly<{ kind: 'hidden' }>
  | Readonly<{
      kind: 'active';
      applyLabel: string;
      cancelLabel: string;
      applyDisabled: boolean;
      draftLabel: string | null;
      rejectionMessage: string | null;
      decision: Readonly<{ open: boolean; canApply: boolean }>;
    }>;

export function buildCanvasRelationalTreeSessionActionsModel(
  state: CanvasRelationalTreeSessionActionsState,
  copy: Pick<
    CanvasRelationalTreeWorkbenchCopy,
    'inspectorDvtRelationalApply' | 'inspectorDvtRelationalCancel'
  >,
  language: string
): CanvasRelationalTreeSessionActionsModel {
  if (!state.active) return { kind: 'hidden' };
  const localCopy = resolveCanvasSemanticEditorCopy(language);
  const rejection = state.applyRejection;
  const rejectionMessage =
    rejection?.reason === 'model_output_required' ||
    rejection?.reason === 'model_output_dependency_unavailable'
      ? formatCanvasModelOutputDependencyRejection(rejection, language)
      : rejection?.reason === 'source_output_unavailable'
        ? localCopy.fieldSelectionRejected
        : rejection?.reason === 'node_unavailable'
          ? localCopy.applyNodeUnavailable
          : rejection == null
            ? null
            : localCopy.applyRejected;
  return {
    kind: 'active',
    applyLabel: copy.inspectorDvtRelationalApply,
    cancelLabel: copy.inspectorDvtRelationalCancel,
    applyDisabled: !state.canApply || !state.hasUnappliedChanges,
    draftLabel: state.hasUnappliedChanges ? localCopy.draft : null,
    rejectionMessage,
    decision: { open: state.pendingNavigation, canApply: state.canApply },
  };
}
