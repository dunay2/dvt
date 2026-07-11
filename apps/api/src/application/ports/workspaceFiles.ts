/**
 * Owned concern: define the protected workspace-file query read models, path
 * policy errors, and outbound repository port.
 */

export type WorkspaceFileEntry = {
  readonly path: string;
  readonly name: string;
  readonly kind: 'file' | 'directory';
  readonly children?: readonly WorkspaceFileEntry[];
};

export type WorkspaceFileContent = {
  readonly path: string;
  readonly name: string;
  readonly language: string;
  readonly content: string;
  readonly contentSha256: string;
  readonly lastModified: string;
};

export type WorkspaceStorageScope = Readonly<{
  tenantId: string;
  projectId: string;
  environmentId: string;
}>;

export class WorkspaceFileNotFoundError extends Error {
  public constructor(readonly path: string) {
    super(`Workspace file was not found: ${path}`);
    this.name = 'WorkspaceFileNotFoundError';
  }
}

export class InvalidWorkspacePathError extends Error {
  public constructor(readonly path: string) {
    super(`Workspace path is invalid: ${path}`);
    this.name = 'InvalidWorkspacePathError';
  }
}

export interface IWorkspaceFileRepository {
  listFiles(scope: WorkspaceStorageScope): Promise<readonly WorkspaceFileEntry[]>;
  getFileContent(scope: WorkspaceStorageScope, path: string): Promise<WorkspaceFileContent>;
  saveFileContent(
    scope: WorkspaceStorageScope,
    path: string,
    content: string
  ): Promise<WorkspaceFileContent>;
  deleteFileContent(scope: WorkspaceStorageScope, path: string): Promise<void>;
}
