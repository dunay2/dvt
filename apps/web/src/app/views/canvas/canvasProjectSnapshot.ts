/** Owned concern: validate and serialize Canvas project snapshot file value objects. */
import {
  WorkspaceGraphAuthoringDraftSchema,
  type WorkspaceGraphAuthoringDraft,
} from '@dvt/contracts';

import type { WorkspaceScope } from '../../ports/sessionContext';
import type { CanvasAuthoringDraftRecord } from './canvasDraftReadModel';

export const PROJECT_SNAPSHOT_FORMAT = 'dvt.project-snapshot';
export const PROJECT_SNAPSHOT_SCHEMA_VERSION = 1;

export type ProjectSnapshot = {
  format: typeof PROJECT_SNAPSHOT_FORMAT;
  schemaVersion: typeof PROJECT_SNAPSHOT_SCHEMA_VERSION;
  exportedAt: string;
  project: WorkspaceScope;
  canvas: WorkspaceGraphAuthoringDraft['canvas'];
  source: {
    draftRevision: string;
    draftSavedAt: string;
  };
  draft: WorkspaceGraphAuthoringDraft;
};

export type ProjectSnapshotImportRejectionReason =
  | 'malformed_json'
  | 'invalid_snapshot'
  | 'unsupported_format'
  | 'unsupported_version'
  | 'missing_project_metadata'
  | 'invalid_draft'
  | 'canvas_identity_mismatch';

export type ProjectSnapshotImportValidation =
  | {
      kind: 'accepted';
      snapshot: ProjectSnapshot;
    }
  | {
      kind: 'rejected';
      reason: ProjectSnapshotImportRejectionReason;
      message: string;
    };

export type ExportProjectSnapshotInput = {
  record: CanvasAuthoringDraftRecord;
  workspaceScope: WorkspaceScope;
  exportedAt: string;
};

export type ExportProjectSnapshotResult = {
  fileName: string;
  contents: string;
  snapshot: ProjectSnapshot;
};

export function buildProjectSnapshotFileName(canvasTitle: string): string {
  const slug = canvasTitle
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `${slug || 'canvas'}-project-snapshot.json`;
}

export function exportProjectSnapshot(
  input: ExportProjectSnapshotInput
): ExportProjectSnapshotResult {
  const draftValidation = WorkspaceGraphAuthoringDraftSchema.safeParse(input.record.draft);
  if (!draftValidation.success) {
    throw new Error('Project snapshot export requires a valid workspace graph authoring draft.');
  }

  const snapshot: ProjectSnapshot = {
    format: PROJECT_SNAPSHOT_FORMAT,
    schemaVersion: PROJECT_SNAPSHOT_SCHEMA_VERSION,
    exportedAt: input.exportedAt,
    project: {
      tenantId: input.workspaceScope.tenantId,
      projectId: input.workspaceScope.projectId,
      environmentId: input.workspaceScope.environmentId,
      targetAdapter: input.workspaceScope.targetAdapter,
    },
    canvas: {
      kind: draftValidation.data.canvas.kind,
      title: draftValidation.data.canvas.title,
    },
    source: {
      draftRevision: input.record.revision,
      draftSavedAt: input.record.savedAt,
    },
    draft: draftValidation.data,
  };

  return {
    fileName: buildProjectSnapshotFileName(snapshot.canvas.title),
    contents: `${JSON.stringify(snapshot, null, 2)}\n`,
    snapshot,
  };
}

export function validateProjectImport(contents: string): ProjectSnapshotImportValidation {
  let parsed: unknown;
  try {
    parsed = JSON.parse(contents);
  } catch {
    return {
      kind: 'rejected',
      reason: 'malformed_json',
      message: 'Project snapshot file is not valid JSON.',
    };
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return {
      kind: 'rejected',
      reason: 'invalid_snapshot',
      message: 'Project snapshot file must contain a JSON object.',
    };
  }

  const candidate = parsed as Record<string, unknown>;
  if (candidate.format !== PROJECT_SNAPSHOT_FORMAT) {
    return {
      kind: 'rejected',
      reason: 'unsupported_format',
      message: 'Project snapshot format is not supported.',
    };
  }

  if (candidate.schemaVersion !== PROJECT_SNAPSHOT_SCHEMA_VERSION) {
    return {
      kind: 'rejected',
      reason: 'unsupported_version',
      message: 'Project snapshot version is not supported.',
    };
  }

  const project = candidate.project;
  if (typeof project !== 'object' || project === null || Array.isArray(project)) {
    return {
      kind: 'rejected',
      reason: 'missing_project_metadata',
      message: 'Project snapshot is missing project metadata.',
    };
  }

  const projectRecord = project as Record<string, unknown>;
  const tenantId = projectRecord.tenantId;
  const projectId = projectRecord.projectId;
  const environmentId = projectRecord.environmentId;
  const targetAdapter = projectRecord.targetAdapter;
  if (
    typeof tenantId !== 'string' ||
    tenantId.trim().length === 0 ||
    typeof projectId !== 'string' ||
    projectId.trim().length === 0 ||
    typeof environmentId !== 'string' ||
    environmentId.trim().length === 0 ||
    targetAdapter !== 'temporal'
  ) {
    return {
      kind: 'rejected',
      reason: 'missing_project_metadata',
      message: 'Project snapshot metadata must include tenant, project, and environment IDs.',
    };
  }

  const canvas = candidate.canvas;
  if (typeof canvas !== 'object' || canvas === null || Array.isArray(canvas)) {
    return {
      kind: 'rejected',
      reason: 'invalid_snapshot',
      message: 'Project snapshot is missing Canvas identity.',
    };
  }

  const canvasRecord = canvas as Record<string, unknown>;
  if (typeof canvasRecord.kind !== 'string' || typeof canvasRecord.title !== 'string') {
    return {
      kind: 'rejected',
      reason: 'invalid_snapshot',
      message: 'Project snapshot Canvas identity is invalid.',
    };
  }

  const draftValidation = WorkspaceGraphAuthoringDraftSchema.safeParse(candidate.draft);
  if (!draftValidation.success) {
    return {
      kind: 'rejected',
      reason: 'invalid_draft',
      message: 'Project snapshot draft does not match the authoring aggregate schema.',
    };
  }

  if (
    canvasRecord.kind !== draftValidation.data.canvas.kind ||
    canvasRecord.title !== draftValidation.data.canvas.title
  ) {
    return {
      kind: 'rejected',
      reason: 'canvas_identity_mismatch',
      message: 'Project snapshot Canvas identity does not match the draft payload.',
    };
  }

  return {
    kind: 'accepted',
    snapshot: {
      format: PROJECT_SNAPSHOT_FORMAT,
      schemaVersion: PROJECT_SNAPSHOT_SCHEMA_VERSION,
      exportedAt:
        typeof candidate.exportedAt === 'string' ? candidate.exportedAt : new Date(0).toISOString(),
      project: {
        tenantId,
        projectId,
        environmentId,
        targetAdapter,
      },
      canvas: {
        kind: draftValidation.data.canvas.kind,
        title: draftValidation.data.canvas.title,
      },
      source: {
        draftRevision:
          typeof (candidate.source as Record<string, unknown> | undefined)?.draftRevision ===
          'string'
            ? ((candidate.source as Record<string, unknown>).draftRevision as string)
            : '',
        draftSavedAt:
          typeof (candidate.source as Record<string, unknown> | undefined)?.draftSavedAt ===
          'string'
            ? ((candidate.source as Record<string, unknown>).draftSavedAt as string)
            : '',
      },
      draft: draftValidation.data,
    },
  };
}

export const canvasProjectSnapshot = {
  format: PROJECT_SNAPSHOT_FORMAT,
  schemaVersion: PROJECT_SNAPSHOT_SCHEMA_VERSION,
  buildFileName: buildProjectSnapshotFileName,
  exportFile: exportProjectSnapshot,
  validateImport: validateProjectImport,
} as const;
