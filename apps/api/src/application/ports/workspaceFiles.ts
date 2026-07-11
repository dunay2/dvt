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

export type ExpectedWorkspaceFileRevision =
  | { readonly kind: 'absent' }
  | { readonly kind: 'content_sha256'; readonly value: string };

export type SaveWorkspaceFileContentInput = {
  readonly path: string;
  readonly content: string;
  readonly expectedRevision: ExpectedWorkspaceFileRevision;
};

export type WorkspaceFileSaveReceipt =
  | {
      readonly kind: 'saved';
      readonly disposition: 'created' | 'updated';
      readonly path: string;
      readonly contentSha256: string;
      readonly lastModified: string;
    }
  | {
      readonly kind: 'unchanged';
      readonly disposition: null;
      readonly path: string;
      readonly contentSha256: string;
      readonly lastModified: string;
    };

export type WorkspaceFileSaveResult =
  | WorkspaceFileSaveReceipt
  | {
      readonly kind: 'conflict';
      readonly currentContentSha256: string | null;
    };

export type DeleteWorkspaceFileContentInput = {
  readonly path: string;
  readonly expectedRevision: Extract<
    ExpectedWorkspaceFileRevision,
    { readonly kind: 'content_sha256' }
  >;
};

export type WorkspaceFileDeleteResult =
  | { readonly kind: 'deleted' }
  | { readonly kind: 'unchanged' }
  | {
      readonly kind: 'conflict';
      readonly currentContentSha256: string;
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

export class WorkspaceFileRevisionConflictError extends Error {
  public constructor(
    readonly path: string,
    readonly currentContentSha256: string | null
  ) {
    super(`Workspace file revision changed before save: ${path}`);
    this.name = 'WorkspaceFileRevisionConflictError';
  }
}

export interface IWorkspaceFileRepository {
  listFiles(scope: WorkspaceStorageScope): Promise<readonly WorkspaceFileEntry[]>;
  getFileContent(scope: WorkspaceStorageScope, path: string): Promise<WorkspaceFileContent>;
  saveFileContent(
    scope: WorkspaceStorageScope,
    input: SaveWorkspaceFileContentInput
  ): Promise<WorkspaceFileSaveResult>;
  deleteFileContent(
    scope: WorkspaceStorageScope,
    input: DeleteWorkspaceFileContentInput
  ): Promise<WorkspaceFileDeleteResult>;
}
