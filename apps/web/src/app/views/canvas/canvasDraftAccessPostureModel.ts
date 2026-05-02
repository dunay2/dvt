/** Owned concern: resolve protected Canvas draft access into one route-visible posture. */
import type {
  WorkspaceGraphDraftCapabilityReason,
  WorkspaceGraphDraftFormatError,
} from '@dvt/contracts';

import type { DraftSaveStatus } from './canvasDraftLifecycle.types';
import type { CanvasDraftAccessMode } from './canvasDraftReadModel';
import type { CanvasDraftRecoveryReason, CanvasDraftToolbarState } from './canvasDraftToolbarState';
import { canvasViewCopy } from './copy';

import type { CanvasDraftAuthTransportPosture } from './canvasDraftAuthTransportPosture';

export type CanvasDraftRecoveryAction =
  | 'none'
  | 'refresh_session'
  | 'change_scope'
  | 'reload_latest_draft'
  | 'inspect_only'
  | 'escalate_format'
  | 'wait';

export type CanvasDraftAccessPostureKind =
  | 'writable'
  | 'saving'
  | 'saved'
  | 'read_only'
  | 'unauthenticated'
  | 'forbidden_scope'
  | 'format_error'
  | 'stale_conflict'
  | 'missing_remote'
  | 'projection_gap'
  | 'unknown_pending';

export type CanvasDraftAccessPosture = Readonly<{
  kind: CanvasDraftAccessPostureKind;
  title: string;
  message: string;
  toolbarLabel: string;
  toolbarTone: CanvasDraftToolbarState['tone'];
  recoveryAction: CanvasDraftRecoveryAction;
  mutationBlocked: boolean;
  showReloadAction: boolean;
  isCenterSurfaceBlocking: boolean;
}>;

export type DeriveCanvasDraftAccessPostureArgs = Readonly<{
  draftAccessMode: CanvasDraftAccessMode;
  draftCapabilityReason: WorkspaceGraphDraftCapabilityReason | null;
  draftFormatError: WorkspaceGraphDraftFormatError | null;
  authTransportPosture: CanvasDraftAuthTransportPosture;
  recoveryReason: CanvasDraftRecoveryReason;
  draftSaveStatus: DraftSaveStatus;
}>;

export type CanvasDraftCommandAdmission = Readonly<{
  canMutateGraph: boolean;
  canPlan: boolean;
  canRun: boolean;
  canReloadLatestDraft: boolean;
}>;

export type CanvasDraftTransportSurfaceState = Readonly<{
  kind: Extract<
    CanvasDraftAccessPostureKind,
    'unauthenticated' | 'forbidden_scope' | 'format_error'
  >;
  title: string;
  message: string;
}>;

export type CanvasDraftRecoveryBannerState = Readonly<{
  dataSlot: string;
  containerClassName: string;
  messageClassName: string;
  title: string;
  message: string;
  actionLabel: string;
  actionEnabled: boolean;
  recoveryAction: CanvasDraftRecoveryAction;
}>;

type CanvasDraftPostureFactoryArgs = Readonly<{
  kind: CanvasDraftAccessPostureKind;
  title: string;
  message: string;
  toolbarLabel: string;
  toolbarTone: CanvasDraftToolbarState['tone'];
  recoveryAction: CanvasDraftRecoveryAction;
  mutationBlocked: boolean;
  showReloadAction?: boolean;
  isCenterSurfaceBlocking?: boolean;
}>;

function createCanvasDraftAccessPosture({
  kind,
  title,
  message,
  toolbarLabel,
  toolbarTone,
  recoveryAction,
  mutationBlocked,
  showReloadAction = false,
  isCenterSurfaceBlocking = false,
}: CanvasDraftPostureFactoryArgs): CanvasDraftAccessPosture {
  return {
    kind,
    title,
    message,
    toolbarLabel,
    toolbarTone,
    recoveryAction,
    mutationBlocked,
    showReloadAction,
    isCenterSurfaceBlocking,
  };
}

function resolveWritableDraftToolbarLabel(draftSaveStatus: DraftSaveStatus): string {
  switch (draftSaveStatus) {
    case 'saving':
      return canvasViewCopy.savingDraftLabel;
    case 'saved':
      return canvasViewCopy.draftSavedLabel;
    default:
      return canvasViewCopy.draftSyncedLabel;
  }
}

function resolveWritablePostureKind(
  draftSaveStatus: DraftSaveStatus
): Extract<CanvasDraftAccessPostureKind, 'writable' | 'saving' | 'saved'> {
  return draftSaveStatus === 'saving' || draftSaveStatus === 'saved' ? draftSaveStatus : 'writable';
}

function resolveDraftFormatPostureContent(
  draftFormatError: WorkspaceGraphDraftFormatError
): Pick<CanvasDraftAccessPosture, 'title' | 'message'> {
  if (draftFormatError.reason === 'unsupported_schema_version') {
    const storedSchemaVersion =
      draftFormatError.storedSchemaVersion == null
        ? ''
        : ` Stored schema version: ${draftFormatError.storedSchemaVersion}.`;
    return {
      title: canvasViewCopy.draftUnsupportedSchemaTitle,
      message: `${canvasViewCopy.draftUnsupportedSchemaMessage}${storedSchemaVersion}`,
    };
  }

  if (draftFormatError.reason === 'migration_failed') {
    return {
      title: canvasViewCopy.draftMigrationFailedTitle,
      message: canvasViewCopy.draftMigrationFailedMessage,
    };
  }

  return {
    title: canvasViewCopy.draftCorruptPayloadTitle,
    message: canvasViewCopy.draftCorruptPayloadMessage,
  };
}

function deriveRecoveryDraftAccessPosture(
  recoveryReason: Exclude<CanvasDraftRecoveryReason, null>
): CanvasDraftAccessPosture {
  switch (recoveryReason) {
    case 'stale_conflict':
      return createCanvasDraftAccessPosture({
        kind: 'stale_conflict',
        title: canvasViewCopy.staleDraftTitle,
        message: canvasViewCopy.staleDraftMessage,
        toolbarLabel: canvasViewCopy.staleVersionLabel,
        toolbarTone: 'danger',
        recoveryAction: 'reload_latest_draft',
        mutationBlocked: true,
        showReloadAction: true,
      });
    case 'missing_remote':
      return createCanvasDraftAccessPosture({
        kind: 'missing_remote',
        title: canvasViewCopy.missingRemoteDraftTitle,
        message: canvasViewCopy.missingRemoteDraftMessage,
        toolbarLabel: canvasViewCopy.draftMissingLabel,
        toolbarTone: 'warning',
        recoveryAction: 'reload_latest_draft',
        mutationBlocked: true,
        showReloadAction: true,
      });
    case 'projection_gap':
      return createCanvasDraftAccessPosture({
        kind: 'projection_gap',
        title: canvasViewCopy.draftProjectionGapTitle,
        message: canvasViewCopy.draftProjectionGapMessage,
        toolbarLabel: canvasViewCopy.projectionGapLabel,
        toolbarTone: 'warning',
        recoveryAction: 'reload_latest_draft',
        mutationBlocked: true,
        showReloadAction: true,
      });
  }
}

function isForbiddenScopeReason(reason: WorkspaceGraphDraftCapabilityReason | null): boolean {
  return reason === 'workspace_scope_denied' || reason === 'tenant_mismatch';
}

export function deriveCanvasDraftAccessPosture({
  draftAccessMode,
  draftCapabilityReason,
  draftFormatError,
  authTransportPosture,
  recoveryReason,
  draftSaveStatus,
}: DeriveCanvasDraftAccessPostureArgs): CanvasDraftAccessPosture {
  if (
    authTransportPosture === 'unauthorized_final' ||
    draftCapabilityReason === 'unauthenticated'
  ) {
    return createCanvasDraftAccessPosture({
      kind: 'unauthenticated',
      title: canvasViewCopy.draftSessionRequiredTitle,
      message: canvasViewCopy.draftSessionRequiredMessage,
      toolbarLabel: canvasViewCopy.sessionRequiredDraftLabel,
      toolbarTone: 'danger',
      recoveryAction: 'refresh_session',
      mutationBlocked: true,
      isCenterSurfaceBlocking: true,
    });
  }

  if (draftFormatError != null) {
    const formatContent = resolveDraftFormatPostureContent(draftFormatError);
    return createCanvasDraftAccessPosture({
      kind: 'format_error',
      title: formatContent.title,
      message: formatContent.message,
      toolbarLabel: canvasViewCopy.draftFormatBlockedLabel,
      toolbarTone: 'danger',
      recoveryAction: 'escalate_format',
      mutationBlocked: true,
      isCenterSurfaceBlocking: true,
    });
  }

  if (draftAccessMode === 'forbidden' || isForbiddenScopeReason(draftCapabilityReason)) {
    return createCanvasDraftAccessPosture({
      kind: 'forbidden_scope',
      title: canvasViewCopy.draftForbiddenScopeTitle,
      message: canvasViewCopy.draftForbiddenScopeMessage,
      toolbarLabel: canvasViewCopy.forbiddenScopeDraftLabel,
      toolbarTone: 'danger',
      recoveryAction: 'change_scope',
      mutationBlocked: true,
      isCenterSurfaceBlocking: true,
    });
  }

  if (draftAccessMode === 'read_only') {
    return createCanvasDraftAccessPosture({
      kind: 'read_only',
      title: canvasViewCopy.draftReadOnlyTitle,
      message: canvasViewCopy.draftReadOnlyMessage,
      toolbarLabel: canvasViewCopy.readOnlyDraftLabel,
      toolbarTone: 'warning',
      recoveryAction: 'inspect_only',
      mutationBlocked: true,
    });
  }

  if (recoveryReason != null) {
    return deriveRecoveryDraftAccessPosture(recoveryReason);
  }

  if (draftAccessMode === 'writable') {
    return createCanvasDraftAccessPosture({
      kind: resolveWritablePostureKind(draftSaveStatus),
      title: canvasViewCopy.canvasReadyDetail,
      message: canvasViewCopy.canvasReadyDetail,
      toolbarLabel: resolveWritableDraftToolbarLabel(draftSaveStatus),
      toolbarTone: 'neutral',
      recoveryAction: 'none',
      mutationBlocked: false,
    });
  }

  return createCanvasDraftAccessPosture({
    kind: 'unknown_pending',
    title: canvasViewCopy.routeLoadingTitle,
    message: canvasViewCopy.routeLoadingMessage,
    toolbarLabel: canvasViewCopy.routeLoadingTitle,
    toolbarTone: 'warning',
    recoveryAction: 'wait',
    mutationBlocked: true,
  });
}

export function isCanvasDraftPostureMutationBlocked(posture: CanvasDraftAccessPosture): boolean {
  return posture.mutationBlocked;
}

export function toCanvasDraftToolbarState(
  posture: CanvasDraftAccessPosture
): CanvasDraftToolbarState {
  return {
    label: posture.toolbarLabel,
    tone: posture.toolbarTone,
    showReloadAction: posture.showReloadAction,
  };
}

export function toCanvasDraftTransportSurfaceState(
  posture: CanvasDraftAccessPosture
): CanvasDraftTransportSurfaceState | null {
  if (
    posture.kind !== 'unauthenticated' &&
    posture.kind !== 'forbidden_scope' &&
    posture.kind !== 'format_error'
  ) {
    return null;
  }

  return {
    kind: posture.kind,
    title: posture.title,
    message: posture.message,
  };
}

function resolveCanvasDraftRecoveryActionLabel(posture: CanvasDraftAccessPosture): string {
  switch (posture.recoveryAction) {
    case 'refresh_session':
      return canvasViewCopy.refreshSessionActionLabel;
    case 'change_scope':
      return canvasViewCopy.changeScopeActionLabel;
    case 'reload_latest_draft':
      return canvasViewCopy.reloadLatestDraftLabel;
    case 'inspect_only':
      return canvasViewCopy.inspectOnlyActionLabel;
    case 'escalate_format':
      return canvasViewCopy.escalateFormatActionLabel;
    default:
      return '';
  }
}

export function toCanvasDraftRecoveryBannerViewState(
  posture: CanvasDraftAccessPosture
): CanvasDraftRecoveryBannerState | null {
  if (posture.recoveryAction === 'none' || posture.recoveryAction === 'wait') {
    return null;
  }

  return {
    dataSlot: 'canvas-recovery-banner',
    containerClassName:
      'border-b border-slate-700/70 bg-slate-950/90 px-4 py-3 text-sm text-slate-100',
    messageClassName: 'text-slate-300',
    title: posture.title,
    message: posture.message,
    actionLabel: resolveCanvasDraftRecoveryActionLabel(posture),
    actionEnabled:
      posture.recoveryAction !== 'inspect_only' && posture.recoveryAction !== 'escalate_format',
    recoveryAction: posture.recoveryAction,
  };
}

export function applyCanvasDraftPostureToRuntimePolicyInput(args: {
  posture: CanvasDraftAccessPosture;
  canMutateGraph: boolean;
  canPlan: boolean;
  canRun: boolean;
  canReloadLatestDraft: boolean;
}): CanvasDraftCommandAdmission {
  if (isCanvasDraftPostureMutationBlocked(args.posture)) {
    return {
      canMutateGraph: false,
      canPlan: false,
      canRun: false,
      canReloadLatestDraft: args.posture.showReloadAction && args.canReloadLatestDraft,
    };
  }

  return {
    canMutateGraph: args.canMutateGraph,
    canPlan: args.canPlan,
    canRun: args.canRun,
    canReloadLatestDraft: args.canReloadLatestDraft,
  };
}

export function resolveCanvasDraftAccessRecoveryCommand(args: {
  posture: CanvasDraftAccessPosture;
  reloadLatestDraft: () => void;
  refetchDraftAfterAuthRefresh: () => void;
  focusScopeControls: () => void;
}): (() => void) | null {
  switch (args.posture.recoveryAction) {
    case 'reload_latest_draft':
      return args.reloadLatestDraft;
    case 'refresh_session':
      return args.refetchDraftAfterAuthRefresh;
    case 'change_scope':
      return args.focusScopeControls;
    default:
      return null;
  }
}
