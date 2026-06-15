/** Owned concern: render actionable draft status signals inside the graph surface. */
import { CanvasDraftSaveStatus } from './CanvasDraftSaveStatus';
import type { CanvasDraftToolbarState } from './canvasDraftToolbarState';
import type { ProjectCanvasDocument } from './canvasProjectCanvasLifecycle';
import { canvasViewCopy } from './copy';

type CanvasGraphStatusOverlayProps = {
  activeCanvas: ProjectCanvasDocument | null;
  draftToolbarState: CanvasDraftToolbarState;
  onReloadLatestDraft: () => void;
};

function shouldRenderDraftStatusOverlay(draftToolbarState: CanvasDraftToolbarState): boolean {
  return (
    draftToolbarState.showReloadAction ||
    draftToolbarState.label === canvasViewCopy.savingDraftLabel ||
    draftToolbarState.tone === 'danger' ||
    draftToolbarState.tone === 'warning'
  );
}

export function CanvasGraphStatusOverlay({
  activeCanvas,
  draftToolbarState,
  onReloadLatestDraft,
}: CanvasGraphStatusOverlayProps): JSX.Element | null {
  if (activeCanvas == null || !shouldRenderDraftStatusOverlay(draftToolbarState)) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute top-3 left-3 z-20 flex max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-2">
      <div className="pointer-events-auto">
        <CanvasDraftSaveStatus
          draftToolbarState={draftToolbarState}
          onReloadLatestDraft={onReloadLatestDraft}
        />
      </div>
    </div>
  );
}
