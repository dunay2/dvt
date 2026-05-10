export type WorkspaceFileLoadErrorKind = 'not_found';

export type WorkspaceApiUnsupportedCapability =
  | 'workspace.diffChanges'
  | 'workspace.plugins'
  | 'workspace.adminRoles'
  | 'workspace.adminAuditLog'
  | 'workspace.fileWrite';

export type WorkspaceApiUnsupportedRail =
  | 'GetWorkspaceDiffChanges'
  | 'ListWorkspacePlugins'
  | 'ListAdminRoles'
  | 'ListAdminAuditLog'
  | 'SaveWorkspaceFileContent';

export const WORKSPACE_HTTP_ERROR_REASON = Object.freeze({
  fileNotFound: 'workspace_file_not_found',
  graphDraftConflict: 'workspace_graph_draft_conflict',
} as const);

export class WorkspaceFileLoadError extends Error {
  readonly kind: WorkspaceFileLoadErrorKind;
  readonly path: string;

  constructor(kind: WorkspaceFileLoadErrorKind, path: string) {
    super(`Workspace file ${kind}: ${path}`);
    this.name = 'WorkspaceFileLoadError';
    this.kind = kind;
    this.path = path;
  }
}

export class WorkspaceGraphDraftConflictError extends Error {
  readonly currentRevision: string;

  constructor(currentRevision: string) {
    super(`Workspace graph draft conflict at revision ${currentRevision}`);
    this.name = 'WorkspaceGraphDraftConflictError';
    this.currentRevision = currentRevision;
  }
}

export class WorkspaceApiCapabilityUnsupportedError extends Error {
  readonly capability: WorkspaceApiUnsupportedCapability;
  readonly rail: WorkspaceApiUnsupportedRail;

  constructor(capability: WorkspaceApiUnsupportedCapability, rail: WorkspaceApiUnsupportedRail) {
    super(
      `${capability} is not available in API mode because ${rail} does not have a backend route.`
    );
    this.name = 'WorkspaceApiCapabilityUnsupportedError';
    this.capability = capability;
    this.rail = rail;
  }
}
