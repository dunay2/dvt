/** Owned concern: render Canvas recovery-banner templates from resolved banner state. */
import { Button } from '../../components/ui/button';
import type { CanvasRecoveryBannerViewState } from './canvasRecoveryBannerModel';

export type CanvasRecoveryBannerTemplateProps = Readonly<{
  viewState: CanvasRecoveryBannerViewState;
  onReloadLatestDraft: () => void;
}>;

export function CanvasRecoveryBannerTemplate({
  viewState,
  onReloadLatestDraft,
}: CanvasRecoveryBannerTemplateProps): JSX.Element {
  return (
    <div data-slot={viewState.dataSlot} className={viewState.containerClassName}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold">{viewState.title}</p>
          <p className={viewState.messageClassName}>{viewState.message}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={onReloadLatestDraft}>
            {viewState.reloadLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
