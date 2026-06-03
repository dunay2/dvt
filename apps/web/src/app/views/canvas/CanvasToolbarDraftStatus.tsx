import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { cn } from '../../components/ui/utils';
import { canvasChromeClasses, resolveCanvasDraftStatusClassName } from './canvasChromeTokens';
import { canvasViewCopy } from './copy';
import type { CanvasDraftToolbarState } from './canvasDraftToolbarState';

type CanvasToolbarDraftStatusProps = {
  draftToolbarState: CanvasDraftToolbarState;
  onReloadLatestDraft: () => void;
};

export function CanvasToolbarDraftStatus({
  draftToolbarState,
  onReloadLatestDraft,
}: CanvasToolbarDraftStatusProps): JSX.Element {
  if (draftToolbarState.showReloadAction) {
    return (
      <div className="flex items-center gap-2">
        <Badge
          data-slot="canvas-draft-save-status"
          variant="outline"
          className={cn(
            canvasChromeClasses.statusBadge,
            resolveCanvasDraftStatusClassName(draftToolbarState.tone)
          )}
        >
          {draftToolbarState.label}
        </Badge>
        <Button
          type="button"
          variant={draftToolbarState.tone === 'danger' ? 'destructive' : 'outline'}
          size="sm"
          onClick={onReloadLatestDraft}
          className="h-8 px-3 text-xs"
        >
          {canvasViewCopy.reloadLatestDraftLabel}
        </Button>
      </div>
    );
  }

  return (
    <Badge
      data-slot="canvas-draft-save-status"
      variant="outline"
      className={cn(
        canvasChromeClasses.statusBadge,
        resolveCanvasDraftStatusClassName(draftToolbarState.tone)
      )}
    >
      {draftToolbarState.label}
    </Badge>
  );
}
