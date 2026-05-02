/** Owned concern: render Canvas recovery-banner templates from resolved banner state. */
import { CanvasDraftAccessRecoveryTemplate } from './CanvasDraftAccessRecovery.templates';
import type { CanvasRecoveryBannerViewState } from './canvasRecoveryBannerModel';

export type CanvasRecoveryBannerTemplateProps = Readonly<{
  viewState: CanvasRecoveryBannerViewState;
  onAction: (() => void) | null;
}>;

export function CanvasRecoveryBannerTemplate({
  viewState,
  onAction,
}: CanvasRecoveryBannerTemplateProps): JSX.Element {
  return (
    <div data-slot={viewState.dataSlot} className={viewState.containerClassName}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold">{viewState.title}</p>
          <p className={viewState.messageClassName}>{viewState.message}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CanvasDraftAccessRecoveryTemplate viewState={viewState} onAction={onAction} />
        </div>
      </div>
    </div>
  );
}
