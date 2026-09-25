/** Owned concern: present the existing local Apply/Cancel transaction without a second edit gate. */
import { createPortal } from 'react-dom';
import type { CanvasRelationalTreeWorkbenchHandle } from './useCanvasRelationalTreeWorkbenchHandle';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';
import { CanvasDraftDecisionDialog } from './CanvasDraftDecisionDialog';
import type { useCanvasRelationEditNavigation } from './useCanvasRelationEditNavigation';
import { CanvasRelationalTreeEditButtons } from './CanvasRelationalTreeEditButtons';

export function CanvasRelationalTreeSessionActions({
  session,
  copy,
  host,
  active,
  navigation,
}: Readonly<{
  session: CanvasRelationalTreeWorkbenchHandle;
  copy: CanvasRelationalTreeWorkbenchCopy;
  host?: HTMLElement | null;
  active: boolean;
  navigation: ReturnType<typeof useCanvasRelationEditNavigation>;
}>): JSX.Element | null {
  const language = useApplicationLanguageStore((state) => state.language);
  const localCopy = resolveCanvasSemanticEditorCopy(language);
  if (!active) return null;
  const rejectionMessage =
    session.applyRejection?.reason === 'node_unavailable'
      ? localCopy.applyNodeUnavailable
      : session.applyRejection == null
        ? null
        : localCopy.applyRejected;
  const actions = (
    <div className="flex items-center gap-1 rounded border border-(--border-subtle) bg-(--surface-panel) p-0.5">
      {rejectionMessage == null ? null : (
        <span role="alert" className="max-w-72 px-2 text-[11px] text-rose-300">
          {rejectionMessage}
        </span>
      )}
      {session.hasUnappliedChanges ? (
        <span role="status" className="px-2 text-[11px] text-amber-200">
          {localCopy.draft}
        </span>
      ) : null}
      <CanvasRelationalTreeEditButtons session={session} copy={copy} />
    </div>
  );
  return (
    <>
      <CanvasDraftDecisionDialog
        open={navigation.pending}
        canApply={session.canApply}
        onStay={navigation.stay}
        onDiscard={navigation.discard}
        onApply={navigation.apply}
        error={rejectionMessage}
      />
      {host ? (
        createPortal(actions, host)
      ) : (
        <div className="absolute right-3 top-2 z-20">{actions}</div>
      )}
    </>
  );
}
