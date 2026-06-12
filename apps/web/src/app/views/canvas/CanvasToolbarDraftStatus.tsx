import { CanvasDraftSaveStatus } from './CanvasDraftSaveStatus';
import type { CanvasDraftToolbarState } from './canvasDraftToolbarState';

type CanvasToolbarDraftStatusProps = {
  draftToolbarState: CanvasDraftToolbarState;
  onReloadLatestDraft: () => void;
};

export function CanvasToolbarDraftStatus({
  draftToolbarState,
  onReloadLatestDraft,
}: CanvasToolbarDraftStatusProps): JSX.Element {
  return (
    <CanvasDraftSaveStatus
      draftToolbarState={draftToolbarState}
      onReloadLatestDraft={onReloadLatestDraft}
    />
  );
}
