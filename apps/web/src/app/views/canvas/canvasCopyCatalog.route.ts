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
  canvasViewportContextSurfaceLabel: {
    key: 'canvas.viewport.contextSurfaceLabel',
    fallback: 'Canvas graph background',
  },
  canvasContextMenuLabel: {
    key: 'canvas.contextMenu.label',
    fallback: 'Canvas actions',
  },
  routeNeedsCanvasTitle: {
    key: 'canvas.route.needsCanvasTitle',
    fallback: 'Create canvas in this workspace',
  },
  routeNeedsCanvasMessage: {
    key: 'canvas.route.needsCanvasMessage',
    fallback:
      'This active workspace does not have a persisted canvas document yet. Choose a canvas template to start authoring.',
  },
  routeNeedsCanvasHelper: {
    key: 'canvas.route.needsCanvasHelper',
    fallback:
      'The selected canvas template is persisted through the protected workspace graph draft boundary before any nodes are added.',
  },
  routeNeedsCanvasWorkspaceLabel: {
    key: 'canvas.route.needsCanvasWorkspaceLabel',
    fallback: 'Active workspace',
  },
  routeNeedsCanvasAdapterLabel: {
    key: 'canvas.route.needsCanvasAdapterLabel',
    fallback: 'Adapter',
  },
  routeNeedsCanvasTemplateLabel: {
    key: 'canvas.route.needsCanvasTemplateLabel',
    fallback: 'Choose a canvas template',
  },
  routeNeedsCanvasReadOnlyMessage: {
    key: 'canvas.route.needsCanvasReadOnlyMessage',
    fallback:
      'Canvas template creation is disabled because graph edits are unavailable for this workspace scope.',
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
  unsupportedCanvasKindMessagePrefix: {
    key: 'canvas.route.unsupportedCanvasKindMessagePrefix',
    fallback: 'Canvas cannot open persisted canvas kind ',
  },
  unsupportedCanvasKindMessageSuffix: {
    key: 'canvas.route.unsupportedCanvasKindMessageSuffix',
    fallback: ' because no runtime registration is available.',
  },
  disabledCanvasPluginMessagePrefix: {
    key: 'canvas.route.disabledCanvasPluginMessagePrefix',
    fallback: 'Canvas cannot open persisted canvas kind ',
  },
  disabledCanvasPluginMessageSuffix: {
    key: 'canvas.route.disabledCanvasPluginMessageSuffix',
    fallback: ' because its plugin is disabled or unavailable.',
  },
  backendBlockedTitle: {
    key: 'canvas.backend.blockedTitle',
    fallback: 'Backend not ready',
  },
  backendBlockedFallbackMessage: {
    key: 'canvas.backend.blockedFallbackMessage',
    fallback: 'Canvas stays blocked until backend readiness is restored.',
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
      'Inspect the graph and overlays here. Use an executable workspace scope to plan or run.',
  },
  limitedAccessTitle: {
    key: 'canvas.readOnly.limitedAccessTitle',
    fallback: 'Limited work mode',
  },
  readOnlyNote: {
    key: 'canvas.readOnly.note',
    fallback: 'Open a writable project or execution scope to keep working.',
  },
  readOnlyActionLabel: {
    key: 'canvas.readOnly.actionLabel',
    fallback: 'Choose execution scope',
  },
  draftAccessDeniedTitle: {
    key: 'canvas.draft.accessDeniedTitle',
    fallback: 'Draft access denied',
  },
  draftAccessDeniedMessage: {
    key: 'canvas.draft.accessDeniedMessage',
    fallback: 'Canvas cannot read the persisted draft for the current workspace scope.',
  },
  sessionRequiredDraftLabel: {
    key: 'canvas.draft.sessionRequiredLabel',
    fallback: 'Session required',
  },
  readOnlyDraftLabel: {
    key: 'canvas.draft.readOnlyLabel',
    fallback: 'Read-only draft',
  },
  forbiddenScopeDraftLabel: {
    key: 'canvas.draft.forbiddenScopeLabel',
    fallback: 'Draft access denied',
  },
  draftFormatBlockedLabel: {
    key: 'canvas.draft.formatBlockedLabel',
    fallback: 'Draft format blocked',
  },
  refreshSessionActionLabel: {
    key: 'canvas.draft.refreshSessionAction',
    fallback: 'Refresh session',
  },
  changeScopeActionLabel: {
    key: 'canvas.draft.changeScopeAction',
    fallback: 'Change scope',
  },
  inspectOnlyActionLabel: {
    key: 'canvas.draft.inspectOnlyAction',
    fallback: 'Inspect only',
  },
  escalateFormatActionLabel: {
    key: 'canvas.draft.escalateFormatAction',
    fallback: 'Escalate draft format issue',
  },
  draftSessionRequiredTitle: {
    key: 'canvas.draft.sessionRequiredTitle',
    fallback: 'Session required for draft access',
  },
  draftSessionRequiredMessage: {
    key: 'canvas.draft.sessionRequiredMessage',
    fallback:
      'Canvas cannot read the protected draft because the current session is missing or expired. Refresh the session.',
  },
  draftForbiddenScopeTitle: {
    key: 'canvas.draft.forbiddenScopeTitle',
    fallback: 'Draft scope is forbidden',
  },
  draftForbiddenScopeMessage: {
    key: 'canvas.draft.forbiddenScopeMessage',
    fallback:
      'Canvas cannot read this workspace draft with the current tenant, project, or permission scope. Change scope or request access.',
  },
  draftReadOnlyTitle: {
    key: 'canvas.draft.readOnlyTitle',
    fallback: 'Draft is read-only',
  },
  draftReadOnlyMessage: {
    key: 'canvas.draft.readOnlyMessage',
    fallback:
      'Canvas can inspect this draft, but graph edits, planning, and run start are disabled for the current scope. Choose an executable workspace scope to work.',
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
    fallback: 'Persisted draft is ahead of the current protected draft authority',
  },
  draftProjectionGapMessage: {
    key: 'canvas.draft.projectionGapMessage',
    fallback:
      'Canvas has paused editing because the current protected draft authority cannot represent the full persisted draft yet. Reload the latest draft after the protected authority catches up.',
  },
  missingRemoteDraftTitle: {
    key: 'canvas.draft.missingRemoteTitle',
    fallback: 'Persisted draft no longer exists',
  },
  missingRemoteDraftMessage: {
    key: 'canvas.draft.missingRemoteMessage',
    fallback:
      'Canvas has paused draft editing because the persisted draft disappeared. Reload the latest draft after protected authority is restored.',
  },
  reloadLatestDraftLabel: {
    key: 'canvas.draft.reloadLatestLabel',
    fallback: 'Reload latest draft',
  },
} satisfies CanvasCopySection;
