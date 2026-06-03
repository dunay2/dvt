/**
 * Owned concern: render the governed recovery banner from canonical route posture.
 */
import type { CanvasDraftAccessPosture } from './canvasDraftAccessPostureModel';
import type { CanvasDraftPresentationState } from './canvasDraftPresentationModel';
import { resolveCanvasRecoveryBannerViewState } from './canvasRecoveryBannerModel';
import { CanvasRecoveryBannerTemplate } from './CanvasRecoveryBanner.templates';

type CanvasRecoveryBannerProps = Readonly<{
  presentationState: Pick<CanvasDraftPresentationState, 'recoveryReason' | 'routeState'>;
  draftAccessPosture: CanvasDraftAccessPosture;
  onDraftAccessRecoveryAction: (() => void) | null;
}>;

export function CanvasRecoveryBanner({
  presentationState,
  draftAccessPosture,
  onDraftAccessRecoveryAction,
}: CanvasRecoveryBannerProps): JSX.Element | null {
  const viewState = resolveCanvasRecoveryBannerViewState({
    ...presentationState,
    draftAccessPosture,
  });

  if (viewState == null) {
    return null;
  }

  return (
    <CanvasRecoveryBannerTemplate viewState={viewState} onAction={onDraftAccessRecoveryAction} />
  );
}
