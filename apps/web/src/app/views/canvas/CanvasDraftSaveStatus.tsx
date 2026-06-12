/** Owned concern: render Canvas draft save status without owning toolbar or graph layout. */
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { cn } from '../../components/ui/utils';
import { canvasChromeClasses, resolveCanvasDraftStatusClassName } from './canvasChromeTokens';
import { canvasViewCopy } from './copy';
import type { CanvasDraftToolbarState } from './canvasDraftToolbarState';

type CanvasDraftSaveStatusProps = {
  draftToolbarState: CanvasDraftToolbarState;
  onReloadLatestDraft: () => void;
};

export function CanvasDraftSaveStatus({
  draftToolbarState,
  onReloadLatestDraft,
}: CanvasDraftSaveStatusProps): JSX.Element {
  const statusBadge = (
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

  if (!draftToolbarState.showReloadAction) {
    return statusBadge;
  }

  return (
    <div className="flex items-center gap-2">
      {statusBadge}
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
