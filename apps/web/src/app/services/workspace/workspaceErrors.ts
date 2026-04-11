export type WorkspaceFileLoadErrorKind = 'not_found';

export const WORKSPACE_HTTP_ERROR_REASON = Object.freeze({
  fileNotFound: 'workspace_file_not_found',
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
