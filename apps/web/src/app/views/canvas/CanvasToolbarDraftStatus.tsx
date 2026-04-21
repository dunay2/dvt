import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { cn } from '../../components/ui/utils';
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
            'h-7 border px-2 text-[11px]',
            draftToolbarState.tone === 'danger'
              ? 'border-rose-500/60 bg-rose-950/40 text-rose-100'
              : 'border-amber-500/60 bg-amber-950/40 text-amber-100'
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
      className="h-7 border-slate-700 bg-slate-950/60 px-2 text-[11px] text-slate-200"
    >
      {draftToolbarState.label}
    </Badge>
  );
}
