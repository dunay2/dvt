import type { LocalizableString } from '../../plugins/contracts/PluginManifest';
import type { CanvasViewCopy } from './canvasCopy.types';

type CanvasCopySection = Partial<Record<keyof CanvasViewCopy, LocalizableString>>;

export const canvasViewExecutionCopyByKey = {
  planPermissionDeniedMessage: {
    key: 'canvas.plan.permissionDeniedMessage',
    fallback: 'You do not have permission to create plans',
  },
  planSqlArtifactRequiredMessage: {
    key: 'canvas.plan.sqlArtifactRequiredMessage',
    fallback:
      'Preview provenance must resolve the SQL artifact before creating a persisted plan.',
  },
  planUnableToCreateMessage: {
    key: 'canvas.plan.unableToCreateMessage',
    fallback: 'Unable to create execution plan',
  },
  previewProvenanceTransformPathRequiredMessage: {
    key: 'canvas.preview.transformPathRequiredMessage',
    fallback:
      'Preview provenance requires one SQL transform node with a workspace file path before planning.',
  },
  previewProvenanceWorkspaceNotConfiguredMessage: {
    key: 'canvas.preview.workspaceNotConfiguredMessage',
    fallback:
      'Preview provenance is not configured for this workspace. Set the Git repo and graph artifact path before planning.',
  },
  previewProvenanceExplicitGitRevisionRequiredMessage: {
    key: 'canvas.preview.explicitGitRevisionRequiredMessage',
    fallback: 'Preview provenance requires an explicit Git branch and commit before planning.',
  },
  previewProvenanceWorkspaceFilesUnavailableMessage: {
    key: 'canvas.preview.workspaceFilesUnavailableMessage',
    fallback: 'Preview provenance could not be resolved from the workspace files.',
  },
  runPermissionDeniedMessage: {
    key: 'canvas.run.permissionDeniedMessage',
    fallback: 'You do not have permission to start runs',
  },
  runNoPlanMessage: {
    key: 'canvas.run.noPlanMessage',
    fallback: 'No execution plan available - run Plan first',
  },
  runPreviewStaleMessage: {
    key: 'canvas.run.previewStaleMessage',
    fallback: 'Preview is stale. Re-run Plan before starting.',
  },
  runPlanRefUnavailableMessage: {
    key: 'canvas.run.planRefUnavailableMessage',
    fallback: 'Plan reference is unavailable for this mode',
  },
  runPersistedPreviewRequiredMessage: {
    key: 'canvas.run.persistedPreviewRequiredMessage',
    fallback:
      'Run start requires a persisted preview plan bound to the current plan reference. Re-run Plan first.',
  },
  runFailedMessage: {
    key: 'canvas.run.failedMessage',
    fallback: 'Failed to start run',
  },
  planCreatedMessage: {
    key: 'canvas.plan.createdMessage',
    fallback: 'Execution plan created',
  },
  runStartedMessage: {
    key: 'canvas.run.startedMessage',
    fallback: 'Run started',
  },
  planStatusRunUnavailableMessage: {
    key: 'canvas.planStatus.runUnavailableMessage',
    fallback: 'Run start is unavailable in this context.',
  },
  planStatusPreviewRequiredMessage: {
    key: 'canvas.planStatus.previewRequiredMessage',
    fallback: 'Preview required before running.',
  },
  planStatusPreviewNotAlignedMessage: {
    key: 'canvas.planStatus.previewNotAlignedMessage',
    fallback: 'Preview is not aligned with the active plan reference. Re-run Plan before starting.',
  },
  planStatusPreviewNotPersistedMessage: {
    key: 'canvas.planStatus.previewNotPersistedMessage',
    fallback: 'Preview is not persisted. Re-run Plan to create a persisted plan.',
  },
  planStatusPreviewReadyMessage: {
    key: 'canvas.planStatus.previewReadyMessage',
    fallback: 'Preview is current and ready to run.',
  },
} satisfies CanvasCopySection;
