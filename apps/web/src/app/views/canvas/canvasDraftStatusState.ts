/** Owned concern: resolve Canvas draft recovery reasons and status labels from draft state. */
import { canvasViewCopy } from './copy';
import type { DraftSaveStatus } from './canvasDraftLifecycle.types';

export type CanvasDraftRecoveryReason =
  | 'stale_conflict'
  | 'missing_remote'
  | 'projection_gap'
  | null;

export type CanvasDraftStatusState = {
  label: string;
  tone: 'neutral' | 'warning' | 'danger';
  showReloadAction: boolean;
};

type CanvasDraftStatusStateArgs = {
  draftSaveStatus: DraftSaveStatus;
  recoveryReason: CanvasDraftRecoveryReason;
};

export function deriveDraftRecoveryReason({
  hasMissingRemoteDraft,
  hasStaleDraftVersion,
  hasDraftProjectionGap,
}: {
  hasMissingRemoteDraft: boolean;
  hasStaleDraftVersion: boolean;
  hasDraftProjectionGap: boolean;
}): CanvasDraftRecoveryReason {
  if (hasStaleDraftVersion) {
    return 'stale_conflict';
  }
  if (hasMissingRemoteDraft) {
    return 'missing_remote';
  }
  if (hasDraftProjectionGap) {
    return 'projection_gap';
  }
  return null;
}

export function resolveCanvasDraftRecoveryBootstrapDetail(
  recoveryReason: CanvasDraftRecoveryReason
): string {
  switch (recoveryReason) {
    case 'stale_conflict':
      return canvasViewCopy.staleDraftMessage;
    case 'missing_remote':
      return canvasViewCopy.missingRemoteDraftMessage;
    case 'projection_gap':
      return canvasViewCopy.draftProjectionGapMessage;
    default:
      return canvasViewCopy.routeLoadingMessage;
  }
}

function resolveNeutralDraftStatusLabel(
  draftSaveStatus: CanvasDraftStatusStateArgs['draftSaveStatus']
): string {
  switch (draftSaveStatus) {
    case 'saving':
      return canvasViewCopy.savingDraftLabel;
    case 'saved':
      return canvasViewCopy.draftSavedLabel;
    case 'failed':
      return canvasViewCopy.draftSaveFailedLabel;
    default:
      return canvasViewCopy.draftSyncedLabel;
  }
}

export function deriveCanvasDraftStatusState({
  draftSaveStatus,
  recoveryReason,
}: CanvasDraftStatusStateArgs): CanvasDraftStatusState {
  switch (recoveryReason) {
    case 'stale_conflict':
      return {
        label: canvasViewCopy.staleVersionLabel,
        tone: 'danger',
        showReloadAction: true,
      };
    case 'missing_remote':
      return {
        label: canvasViewCopy.draftMissingLabel,
        tone: 'warning',
        showReloadAction: true,
      };
    case 'projection_gap':
      return {
        label: canvasViewCopy.projectionGapLabel,
        tone: 'warning',
        showReloadAction: true,
      };
    default:
      return {
        label: resolveNeutralDraftStatusLabel(draftSaveStatus),
        tone: draftSaveStatus === 'failed' ? 'danger' : 'neutral',
        showReloadAction: false,
      };
  }
}
