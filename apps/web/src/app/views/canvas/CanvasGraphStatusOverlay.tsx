/** Owned concern: render minimal active-canvas and draft status signals inside the graph surface. */
import { Badge } from '../../components/ui/badge';
import { CanvasDraftSaveStatus } from './CanvasDraftSaveStatus';
import type { CanvasDraftToolbarState } from './canvasDraftToolbarState';
import type { ProjectCanvasDocument } from './canvasProjectCanvasLifecycle';

type CanvasGraphStatusOverlayProps = {
  activeCanvas: ProjectCanvasDocument | null;
  draftToolbarState: CanvasDraftToolbarState;
  onReloadLatestDraft: () => void;
};

export function CanvasGraphStatusOverlay({
  activeCanvas,
  draftToolbarState,
  onReloadLatestDraft,
}: CanvasGraphStatusOverlayProps): JSX.Element | null {
  if (activeCanvas == null) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute top-3 left-3 z-20 flex max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-2">
      <Badge
        data-slot="canvas-active-canvas-identity"
        data-kind={activeCanvas.kind}
        variant="outline"
        className="pointer-events-auto h-8 max-w-72 truncate rounded-md border border-[color:var(--border-default)] bg-[var(--surface-panel)] px-3 text-xs font-semibold text-[var(--text-strong)] shadow-sm"
        title={activeCanvas.title}
      >
        {activeCanvas.title}
      </Badge>
      <div className="pointer-events-auto">
        <CanvasDraftSaveStatus
          draftToolbarState={draftToolbarState}
          onReloadLatestDraft={onReloadLatestDraft}
        />
      </div>
    </div>
  );
}
