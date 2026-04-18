export type WorkspaceFileLoadErrorKind = 'not_found';

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
