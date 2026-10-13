/**
 * Owned concern: bind the current edit session, navigation decisions and locale to passive actions.
 * @baseline GH-3629: the Workbench composes concerns and the pure model owns presentation projection.
 * @decision Forward current callbacks and an explicit scalar snapshot without temporal state or effects.
 * @consequence Toolbar Apply and navigation Apply remain distinct existing commands.
 */
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import type { CanvasRelationalTreeWorkbenchHandle } from './useCanvasRelationalTreeWorkbenchHandle';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';
import {
  buildCanvasRelationalTreeSessionActionsModel,
  type CanvasRelationalTreeSessionActionsModel,
  type CanvasRelationalTreeSessionActionsBinding,
} from './canvasRelationalTreeSessionActionsModel';

type CanvasRelationalTreeSessionActionsNavigation = Readonly<{
  pending: boolean;
  stay: () => void;
  discard: () => void;
  apply: () => void;
}>;

export function useCanvasRelationalTreeSessionActions({
  active,
  session,
  navigation,
  copy,
}: Readonly<{
  active: boolean;
  session: CanvasRelationalTreeWorkbenchHandle;
  navigation: CanvasRelationalTreeSessionActionsNavigation;
  copy: Pick<
    CanvasRelationalTreeWorkbenchCopy,
    'inspectorDvtRelationalApply' | 'inspectorDvtRelationalCancel'
  >;
}>): Readonly<{
  model: CanvasRelationalTreeSessionActionsModel;
  binding: CanvasRelationalTreeSessionActionsBinding;
}> {
  const language = useApplicationLanguageStore((state) => state.language);
  return {
    model: buildCanvasRelationalTreeSessionActionsModel(
      {
        active,
        canApply: session.canApply,
        hasUnappliedChanges: session.hasUnappliedChanges,
        applyRejection: session.applyRejection,
        pendingNavigation: navigation.pending,
      },
      copy,
      language
    ),
    binding: {
      onApply: session.apply,
      onCancel: session.cancel,
      onStay: navigation.stay,
      onDiscard: navigation.discard,
      onApplyAndNavigate: navigation.apply,
    },
  };
}
