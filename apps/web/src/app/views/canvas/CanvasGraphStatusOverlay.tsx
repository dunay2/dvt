/** Owned concern: render actionable draft status signals inside the graph surface. */
import { CanvasDraftSaveStatus } from './CanvasDraftSaveStatus';
import type { CanvasDraftStatusState } from './canvasDraftStatusState';
import type { ProjectCanvasDocument } from './canvasProjectCanvasLifecycle';
import { canvasViewCopy } from './copy';

type CanvasGraphStatusOverlayProps = {
  activeCanvas: ProjectCanvasDocument | null;
  draftStatusState: CanvasDraftStatusState;
  onReloadLatestDraft: () => void;
};

function shouldRenderDraftStatusOverlay(draftStatusState: CanvasDraftStatusState): boolean {
  return (
    draftStatusState.showReloadAction ||
    draftStatusState.label === canvasViewCopy.savingDraftLabel ||
    draftStatusState.tone === 'danger' ||
    draftStatusState.tone === 'warning'
  );
}

export function CanvasGraphStatusOverlay({
  activeCanvas,
  draftStatusState,
  onReloadLatestDraft,
}: CanvasGraphStatusOverlayProps): JSX.Element | null {
  if (activeCanvas == null || !shouldRenderDraftStatusOverlay(draftStatusState)) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute top-3 left-3 z-20 flex max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-2">
      <div className="pointer-events-auto">
        <CanvasDraftSaveStatus
          draftStatusState={draftStatusState}
          onReloadLatestDraft={onReloadLatestDraft}
        />
      </div>
    </div>
  );
}
