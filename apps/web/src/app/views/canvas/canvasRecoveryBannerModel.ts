/** Owned concern: resolve Canvas recovery-banner state without rendering JSX. */
import type { CanvasDraftPresentationState } from './canvasDraftPresentationModel';
import { canvasViewCopy } from './copy';

export type CanvasRecoveryBannerViewState = Readonly<{
  dataSlot: string;
  containerClassName: string;
  messageClassName: string;
  title: string;
  message: string;
  reloadLabel: string;
}>;

export function resolveCanvasRecoveryBannerViewState(
  presentationState: Pick<CanvasDraftPresentationState, 'recoveryReason' | 'routeState'>
): CanvasRecoveryBannerViewState | null {
  if (presentationState.routeState !== 'recovery') {
    return null;
  }

  if (presentationState.recoveryReason === 'stale_conflict') {
    return {
      dataSlot: 'canvas-stale-draft-state',
      containerClassName:
        'border-b border-amber-500/40 bg-amber-950/40 px-4 py-3 text-sm text-amber-100',
      messageClassName: 'text-amber-200',
      title: canvasViewCopy.staleDraftTitle,
      message: canvasViewCopy.staleDraftMessage,
      reloadLabel: canvasViewCopy.reloadLatestDraftLabel,
    };
  }

  if (presentationState.recoveryReason === 'missing_remote') {
    return {
      dataSlot: 'canvas-missing-remote-draft-state',
      containerClassName:
        'border-b border-rose-500/40 bg-rose-950/40 px-4 py-3 text-sm text-rose-100',
      messageClassName: 'text-rose-200',
      title: canvasViewCopy.missingRemoteDraftTitle,
      message: canvasViewCopy.missingRemoteDraftMessage,
      reloadLabel: canvasViewCopy.reloadLatestDraftLabel,
    };
  }

  if (presentationState.recoveryReason !== 'projection_gap') {
    return null;
  }

  return {
    dataSlot: 'canvas-draft-projection-gap-state',
    containerClassName: 'border-b border-sky-500/40 bg-sky-950/40 px-4 py-3 text-sm text-sky-100',
    messageClassName: 'text-sky-200',
    title: canvasViewCopy.draftProjectionGapTitle,
    message: canvasViewCopy.draftProjectionGapMessage,
    reloadLabel: canvasViewCopy.reloadLatestDraftLabel,
  };
}
