/**
 * Owned concern: define the protected workspace-file query read models, path
 * policy errors, and outbound repository port.
 *
 * @baseline ADR-0060: dbt Project Authoring Authority
 * @decision Expose stable content revisions and compare-and-swap writes at the workspace-file port.
 * @consequence File-backed authoring cannot silently overwrite a newer authoritative project revision.
 * @version 1.0.0
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
  { readonly kind: 'absent' } | { readonly kind: 'content_sha256'; readonly value: string };

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

export type WorkspaceFileBatchExpectedFile = Readonly<{
  path: string;
  expectedContentSha256?: string;
}>;

export type WorkspaceFileBatchWrite = Readonly<{
  path: string;
  content: string;
}>;

export type WorkspaceFileBatchMutation = Readonly<{
  expectedFiles: readonly WorkspaceFileBatchExpectedFile[];
  writes: readonly WorkspaceFileBatchWrite[];
  deletes: readonly string[];
  idempotencyKey: string;
}>;

export type WorkspaceFileBatchReceipt = Readonly<{
  kind: 'applied';
  idempotencyKey: string;
  requestHash: string;
  deduplicated: boolean;
  writes: readonly Readonly<{
    path: string;
    contentSha256: string;
  }>[];
  deletes: readonly string[];
}>;

export type WorkspaceFileBatchMutationResult =
  | WorkspaceFileBatchReceipt
  | Readonly<{
      kind: 'conflict';
      conflicts: readonly Readonly<{
        path: string;
        currentContentSha256: string | null;
      }>[];
    }>;

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

export class InvalidWorkspaceFileBatchMutationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'InvalidWorkspaceFileBatchMutationError';
  }
}

export class WorkspaceFileBatchIdempotencyConflictError extends Error {
  public constructor(readonly idempotencyKey: string) {
    super(
      `Workspace file batch idempotency key was reused with a different request: ${idempotencyKey}`
    );
    this.name = 'WorkspaceFileBatchIdempotencyConflictError';
  }
}

export class InvalidWorkspaceFileBatchReceiptError extends Error {
  public constructor(readonly idempotencyKey: string) {
    super(`Workspace file batch receipt is invalid: ${idempotencyKey}`);
    this.name = 'InvalidWorkspaceFileBatchReceiptError';
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

export interface IWorkspaceMetadataFileRepository {
  getFileContent(scope: WorkspaceStorageScope, path: string): Promise<WorkspaceFileContent>;
  saveFileContent(
    scope: WorkspaceStorageScope,
    input: SaveWorkspaceFileContentInput
  ): Promise<WorkspaceFileSaveResult>;
}

export interface IWorkspaceFileBatchMutationPort {
  apply(
    scope: WorkspaceStorageScope,
    mutation: WorkspaceFileBatchMutation
  ): Promise<WorkspaceFileBatchMutationResult>;
}
