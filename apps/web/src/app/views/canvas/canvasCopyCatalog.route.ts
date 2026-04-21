import type { LocalizableString } from '../../plugins/contracts/PluginManifest';
import type { CanvasViewCopy } from './canvasCopy.types';

type CanvasCopySection = Partial<Record<keyof CanvasViewCopy, LocalizableString>>;

export const canvasViewRouteCopyByKey = {
  routeLoadingTitle: {
    key: 'canvas.route.loadingTitle',
    fallback: 'Loading canvas',
  },
  routeLoadingMessage: {
    key: 'canvas.route.loadingMessage',
    fallback: 'Loading workspace graph data for the main authoring surface.',
  },
  backendLoadingTitle: {
    key: 'canvas.backend.loadingTitle',
    fallback: 'Checking backend readiness',
  },
  backendLoadingMessage: {
    key: 'canvas.backend.loadingMessage',
    fallback:
      'Canvas is waiting for the backend readiness checks to settle before loading the authoring surface.',
  },
  routeEmptyTitle: {
    key: 'canvas.route.emptyTitle',
    fallback: 'No graph content loaded',
  },
  routeEmptyEditableMessage: {
    key: 'canvas.route.emptyEditableMessage',
    fallback:
      'This workspace does not expose graph nodes yet. Use Add data to import sources or load graph content before planning.',
  },
  routeEmptyReadOnlyMessage: {
    key: 'canvas.route.emptyReadOnlyMessage',
    fallback:
      'This workspace does not expose graph nodes yet. Graph edits are disabled in this context.',
  },
  routeErrorTitle: {
    key: 'canvas.route.errorTitle',
    fallback: 'Canvas unavailable',
  },
  routeErrorFallbackMessage: {
    key: 'canvas.route.errorFallbackMessage',
    fallback: 'The workspace graph could not be loaded for Canvas.',
  },
  routeErrorMessage: {
    key: 'canvas.route.errorMessage',
    fallback:
      'Canvas could not load the current workspace graph. Retry after the workspace service is available again.',
  },
  backendBlockedTitle: {
    key: 'canvas.backend.blockedTitle',
    fallback: 'Backend not ready',
  },
  backendBlockedFallbackMessage: {
    key: 'canvas.backend.blockedFallbackMessage',
    fallback: 'Canvas stays blocked until backend readiness is restored in API mode.',
  },
  mutationUnavailableMessage: {
    key: 'canvas.mutation.unavailableMessage',
    fallback: 'Graph edits are unavailable in this context.',
  },
  readOnlyTitle: {
    key: 'canvas.readOnly.title',
    fallback: 'Read-only canvas',
  },
  readOnlyMessage: {
    key: 'canvas.readOnly.message',
    fallback:
      'Inspect the graph and overlays here, but planning, run start, and graph edits are disabled in this context.',
  },
  limitedAccessTitle: {
    key: 'canvas.readOnly.limitedAccessTitle',
    fallback: 'Limited mutation access',
  },
  readOnlyNote: {
    key: 'canvas.readOnly.note',
    fallback: 'Graph inspection and overlays remain available while mutation is gated.',
  },
  draftAccessDeniedTitle: {
    key: 'canvas.draft.accessDeniedTitle',
    fallback: 'Draft access denied',
  },
  draftAccessDeniedMessage: {
    key: 'canvas.draft.accessDeniedMessage',
    fallback: 'Canvas cannot read the persisted draft for the current workspace scope.',
  },
  draftUnsupportedSchemaTitle: {
    key: 'canvas.draft.unsupportedSchemaTitle',
    fallback: 'Persisted draft format is unsupported',
  },
  draftUnsupportedSchemaMessage: {
    key: 'canvas.draft.unsupportedSchemaMessage',
    fallback:
      'Canvas cannot load the persisted draft because its stored schema version is not supported by this route yet.',
  },
  draftCorruptPayloadTitle: {
    key: 'canvas.draft.corruptPayloadTitle',
    fallback: 'Persisted draft payload is corrupt',
  },
  draftCorruptPayloadMessage: {
    key: 'canvas.draft.corruptPayloadMessage',
    fallback:
      'Canvas cannot load the persisted draft because the stored payload is corrupt and fails the governed contract.',
  },
  draftMigrationFailedTitle: {
    key: 'canvas.draft.migrationFailedTitle',
    fallback: 'Persisted draft migration failed',
  },
  draftMigrationFailedMessage: {
    key: 'canvas.draft.migrationFailedMessage',
    fallback:
      'Canvas cannot load the persisted draft because its governed migration to the active format failed.',
  },
  staleDraftTitle: {
    key: 'canvas.draft.staleTitle',
    fallback: 'Stale draft version',
  },
  staleDraftMessage: {
    key: 'canvas.draft.staleMessage',
    fallback: 'A newer draft was saved elsewhere. Reload the latest draft before continuing edits.',
  },
  draftProjectionGapTitle: {
    key: 'canvas.draft.projectionGapTitle',
    fallback: 'Persisted draft is ahead of the current graph snapshot',
  },
  draftProjectionGapMessage: {
    key: 'canvas.draft.projectionGapMessage',
    fallback:
      'Canvas has paused editing because the current workspace graph cannot represent the full persisted draft yet. Reload the latest draft or adopt the current workspace snapshot before continuing.',
  },
  missingRemoteDraftTitle: {
    key: 'canvas.draft.missingRemoteTitle',
    fallback: 'Persisted draft no longer exists',
  },
  missingRemoteDraftMessage: {
    key: 'canvas.draft.missingRemoteMessage',
    fallback:
      'Canvas has paused draft editing because the persisted draft disappeared. Adopt the current workspace snapshot before continuing.',
  },
  reloadLatestDraftLabel: {
    key: 'canvas.draft.reloadLatestLabel',
    fallback: 'Reload latest draft',
  },
  adoptCurrentWorkspaceSnapshotLabel: {
    key: 'canvas.draft.adoptSnapshotLabel',
    fallback: 'Adopt current workspace snapshot',
  },
} satisfies CanvasCopySection;
