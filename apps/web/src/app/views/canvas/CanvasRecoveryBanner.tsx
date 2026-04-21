import { Button } from '../../components/ui/button';
import { canvasViewCopy } from './copy';
import type { useCanvasController } from './useCanvasController';

type CanvasControllerRecovery = Pick<
  ReturnType<typeof useCanvasController>,
  'draftRecoveryReason' | 'reloadLatestDraft' | 'adoptCurrentWorkspaceSnapshot'
>;

export function CanvasRecoveryBanner({
  controller,
  visible,
}: {
  controller: CanvasControllerRecovery;
  visible: boolean;
}) {
  if (!visible) {
    return null;
  }

  if (controller.draftRecoveryReason === 'stale_conflict') {
    return (
      <div
        data-slot="canvas-stale-draft-state"
        className="border-b border-amber-500/40 bg-amber-950/40 px-4 py-3 text-sm text-amber-100"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold">{canvasViewCopy.staleDraftTitle}</p>
            <p className="text-amber-200">{canvasViewCopy.staleDraftMessage}</p>
          </div>
          <Button size="sm" variant="outline" onClick={controller.reloadLatestDraft}>
            Reload latest draft
          </Button>
        </div>
      </div>
    );
  }

  if (controller.draftRecoveryReason === 'missing_remote') {
    return (
      <div
        data-slot="canvas-missing-remote-draft-state"
        className="border-b border-rose-500/40 bg-rose-950/40 px-4 py-3 text-sm text-rose-100"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold">{canvasViewCopy.missingRemoteDraftTitle}</p>
            <p className="text-rose-200">{canvasViewCopy.missingRemoteDraftMessage}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={controller.reloadLatestDraft}>
              {canvasViewCopy.reloadLatestDraftLabel}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={controller.adoptCurrentWorkspaceSnapshot}
            >
              {canvasViewCopy.adoptCurrentWorkspaceSnapshotLabel}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (controller.draftRecoveryReason !== 'projection_gap') {
    return null;
  }

  return (
    <div
      data-slot="canvas-draft-projection-gap-state"
      className="border-b border-sky-500/40 bg-sky-950/40 px-4 py-3 text-sm text-sky-100"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold">{canvasViewCopy.draftProjectionGapTitle}</p>
          <p className="text-sky-200">{canvasViewCopy.draftProjectionGapMessage}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={controller.reloadLatestDraft}>
            {canvasViewCopy.reloadLatestDraftLabel}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={controller.adoptCurrentWorkspaceSnapshot}
          >
            {canvasViewCopy.adoptCurrentWorkspaceSnapshotLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
