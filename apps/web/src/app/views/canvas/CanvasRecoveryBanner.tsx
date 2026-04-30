/**
 * Owned concern: render the governed recovery banner from canonical route posture.
 */
import type { CanvasDraftPresentationState } from './canvasDraftPresentationModel';
import { resolveCanvasRecoveryBannerViewState } from './canvasRecoveryBannerModel';
import { CanvasRecoveryBannerTemplate } from './CanvasRecoveryBanner.templates';

type CanvasRecoveryBannerProps = Readonly<{
  presentationState: Pick<CanvasDraftPresentationState, 'recoveryReason' | 'routeState'>;
  onReloadLatestDraft: () => void;
}>;

export function CanvasRecoveryBanner({
  presentationState,
  onReloadLatestDraft,
}: CanvasRecoveryBannerProps): JSX.Element | null {
  const viewState = resolveCanvasRecoveryBannerViewState(presentationState);

  if (viewState == null) {
    return null;
  }

  return (
    <CanvasRecoveryBannerTemplate viewState={viewState} onReloadLatestDraft={onReloadLatestDraft} />
  );
}
