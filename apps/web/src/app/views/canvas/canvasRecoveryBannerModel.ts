/** Owned concern: resolve Canvas recovery-banner state without rendering JSX. */
import {
  toCanvasDraftRecoveryBannerViewState,
  type CanvasDraftAccessPosture,
} from './canvasDraftAccessPostureModel';
import type { CanvasDraftPresentationState } from './canvasDraftPresentationModel';
import { canvasViewCopy } from './copy';

export type CanvasRecoveryBannerViewState = Readonly<{
  dataSlot: string;
  containerClassName: string;
  messageClassName: string;
  title: string;
  message: string;
  actionLabel: string;
  actionEnabled: boolean;
}>;

type CanvasRecoveryBannerPostureArgs = Readonly<{
  draftAccessPosture: CanvasDraftAccessPosture;
}> &
  Partial<Pick<CanvasDraftPresentationState, 'recoveryReason' | 'routeState'>>;

type CanvasRecoveryBannerPresentationArgs = Pick<
  CanvasDraftPresentationState,
  'recoveryReason' | 'routeState'
> &
  Readonly<{
    draftAccessPosture?: undefined;
  }>;

type ResolveCanvasRecoveryBannerViewStateArgs =
  | CanvasRecoveryBannerPostureArgs
  | CanvasRecoveryBannerPresentationArgs;

function isRouteRecoveryPosture(posture: CanvasDraftAccessPosture): boolean {
  return (
    posture.kind === 'stale_conflict' ||
    posture.kind === 'missing_remote' ||
    posture.kind === 'projection_gap'
  );
}

export function resolveCanvasRecoveryBannerViewState(
  presentationState: ResolveCanvasRecoveryBannerViewStateArgs
): CanvasRecoveryBannerViewState | null {
  if (presentationState.draftAccessPosture != null) {
    if (
      isRouteRecoveryPosture(presentationState.draftAccessPosture) &&
      presentationState.routeState !== undefined &&
      presentationState.routeState !== 'recovery'
    ) {
      return null;
    }

    const postureBanner = toCanvasDraftRecoveryBannerViewState(
      presentationState.draftAccessPosture
    );
    if (postureBanner != null) {
      return postureBanner;
    }
  }

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
      actionLabel: canvasViewCopy.reloadLatestDraftLabel,
      actionEnabled: true,
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
      actionLabel: canvasViewCopy.reloadLatestDraftLabel,
      actionEnabled: true,
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
    actionLabel: canvasViewCopy.reloadLatestDraftLabel,
    actionEnabled: true,
  };
}
