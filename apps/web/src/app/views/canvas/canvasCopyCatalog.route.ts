import type { CanvasViewCopy } from './canvasCopy.types';

export const canvasViewRouteCopyByKey = {
  routeLoadingTitle: 'Loading canvas',
  routeLoadingMessage: 'Loading workspace graph data for the main authoring surface.',
  backendLoadingTitle: 'Checking backend readiness',
  backendLoadingMessage:
    'Canvas is waiting for the backend readiness checks to settle before loading the authoring surface.',
  canvasViewportContextSurfaceLabel: 'Canvas graph background',
  canvasContextMenuLabel: 'Canvas actions',
  routeNeedsCanvasTitle: 'Canvas',
  routeNeedsCanvasMessage: 'Add sources and build your transformations here.',
  routeNeedsCanvasActionLabel: 'Start canvas',
  routeNeedsCanvasReadOnlyMessage:
    'You do not have permission to create the Canvas in this project.',
  routeErrorTitle: 'Canvas unavailable',
  routeErrorFallbackMessage: 'The workspace graph could not be loaded for Canvas.',
  routeErrorMessage:
    'Canvas could not load the current workspace graph. Retry after the workspace service is available again.',
  unsupportedCanvasKindMessagePrefix: 'Canvas cannot open persisted canvas kind ',
  unsupportedCanvasKindMessageSuffix: ' because no runtime registration is available.',
  disabledCanvasPluginMessagePrefix: 'Canvas cannot open persisted canvas kind ',
  disabledCanvasPluginMessageSuffix: ' because its plugin is disabled or unavailable.',
  backendBlockedTitle: 'Backend not ready',
  backendBlockedFallbackMessage: 'Canvas stays blocked until backend readiness is restored.',
  mutationUnavailableMessage: 'Graph edits are unavailable in this context.',
  readOnlyTitle: 'Read-only canvas',
  readOnlyMessage:
    'Inspect the graph and overlays here. Use an executable workspace scope to plan or run.',
  limitedAccessTitle: 'Limited work mode',
  readOnlyNote: 'Open a writable project or execution scope to keep working.',
  readOnlyActionLabel: 'Choose execution scope',
  sessionRequiredDraftLabel: 'Session required',
  readOnlyDraftLabel: 'Read-only draft',
  forbiddenScopeDraftLabel: 'Draft access denied',
  draftFormatBlockedLabel: 'Draft format blocked',
  refreshSessionActionLabel: 'Refresh session',
  changeScopeActionLabel: 'Change scope',
  inspectOnlyActionLabel: 'Inspect only',
  escalateFormatActionLabel: 'Escalate draft format issue',
  draftSessionRequiredTitle: 'Session required for draft access',
  draftSessionRequiredMessage:
    'Canvas cannot read the protected draft because the current session is missing or expired. Refresh the session.',
  draftForbiddenScopeTitle: 'Draft scope is forbidden',
  draftForbiddenScopeMessage:
    'Canvas cannot read this workspace draft with the current tenant, project, or permission scope. Change scope or request access.',
  draftReadOnlyTitle: 'Draft is read-only',
  draftReadOnlyMessage:
    'Canvas can inspect this draft, but graph edits, planning, and run start are disabled for the current scope. Choose an executable workspace scope to work.',
  draftUnsupportedSchemaTitle: 'Persisted draft format is unsupported',
  draftUnsupportedSchemaMessage:
    'Canvas cannot load the persisted draft because its stored schema version is not supported by this route yet.',
  draftCorruptPayloadTitle: 'Persisted draft payload is corrupt',
  draftCorruptPayloadMessage:
    'Canvas cannot load the persisted draft because the stored payload is corrupt and fails the governed contract.',
  staleDraftTitle: 'Stale draft version',
  staleDraftMessage:
    'A newer draft was saved elsewhere. Reload the latest draft before continuing edits.',
  draftProjectionGapTitle: 'Persisted draft is ahead of the current protected draft authority',
  draftProjectionGapMessage:
    'Canvas has paused editing because the current protected draft authority cannot represent the full persisted draft yet. Reload the latest draft after the protected authority catches up.',
  missingRemoteDraftTitle: 'Persisted draft no longer exists',
  missingRemoteDraftMessage:
    'Canvas has paused draft editing because the persisted draft disappeared. Reload the latest draft after protected authority is restored.',
  reloadLatestDraftLabel: 'Reload latest draft',
} satisfies Partial<CanvasViewCopy>;
