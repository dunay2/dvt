export type WorkspaceFileLoadErrorKind = 'not_found';

export type WarehouseSourceDataSampleQueryErrorReason =
  'connection_not_found' | 'source_object_not_found' | 'unavailable';

export class WarehouseSourceDataSampleQueryError extends Error {
  public constructor(readonly reason: WarehouseSourceDataSampleQueryErrorReason) {
    super(`Warehouse source data sample failed: ${reason}`);
    this.name = 'WarehouseSourceDataSampleQueryError';
  }
}

export type WorkspaceApiUnsupportedCapability =
  | 'workspace.diffChanges'
  | 'workspace.adminRoles'
  | 'workspace.adminAuditLog'
  | 'workspace.fileWrite';

export type WorkspaceApiUnsupportedRail =
  'GetWorkspaceDiffChanges' | 'ListAdminRoles' | 'ListAdminAuditLog' | 'SaveWorkspaceFileContent';

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

export class WorkspaceFileRevisionConflictError extends Error {
  readonly path: string;

  constructor(path: string) {
    super(`Workspace file changed before save: ${path}`);
    this.name = 'WorkspaceFileRevisionConflictError';
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
    super(`${capability} is unavailable because ${rail} does not have a backend route.`);
    this.name = 'WorkspaceApiCapabilityUnsupportedError';
    this.capability = capability;
    this.rail = rail;
  }
}
