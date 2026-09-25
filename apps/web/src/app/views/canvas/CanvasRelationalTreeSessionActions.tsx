/** Owned concern: present the existing local Apply/Cancel transaction without a second edit gate. */
import { Check, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import type { CanvasRelationalTreeWorkbenchHandle } from './useCanvasRelationalTreeWorkbenchHandle';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';

export function CanvasRelationalTreeSessionActions({
  session,
  copy,
  host,
  active,
}: Readonly<{
  session: CanvasRelationalTreeWorkbenchHandle;
  copy: CanvasRelationalTreeWorkbenchCopy;
  host?: HTMLElement | null;
  active: boolean;
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
      <button
        type="button"
        data-slot="canvas-relational-tree-apply"
        aria-label={copy.inspectorDvtRelationalApply}
        title={copy.inspectorDvtRelationalApply}
        disabled={!session.canApply || !session.hasUnappliedChanges}
        onClick={session.apply}
        className="grid size-8 place-items-center rounded text-emerald-300 hover:bg-(--surface-selected) disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Check aria-hidden="true" className="size-4" />
      </button>
      <button
        type="button"
        data-slot="canvas-relational-tree-cancel"
        aria-label={copy.inspectorDvtRelationalCancel}
        title={copy.inspectorDvtRelationalCancel}
        onClick={session.cancel}
        className="grid size-8 place-items-center rounded text-(--text-muted) hover:bg-(--surface-selected)"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
  return host ? (
    createPortal(actions, host)
  ) : (
    <div className="absolute right-3 top-2 z-20">{actions}</div>
  );
}
