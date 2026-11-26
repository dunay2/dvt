/**
 * Owned concern: define protected workspace file-history read models and the
 * outbound repository port for file-scoped Git history queries.
 */
import type { WorkspaceStorageScope } from './workspaceFiles.js';

export type WorkspaceFileHistoryEntry = {
  readonly commitSha: string;
  readonly shortSha: string;
  readonly authorName: string;
  readonly authoredAt: string;
  readonly subject: string;
  readonly path: string;
};

export interface IWorkspaceFileHistoryRepository {
  listFileHistory(
    scope: WorkspaceStorageScope,
    path: string,
    before?: string
  ): Promise<readonly WorkspaceFileHistoryEntry[]>;
  getFileVersionContent(
    scope: WorkspaceStorageScope,
    path: string,
    revision: string
  ): Promise<string | null>;
}

export type CommitWorkspaceFileVersionInput = Readonly<{
  path: string;
  expectedContentSha256: string;
  author: string;
}>;

export type WorkspaceFileVersionCommitResult =
  Readonly<{ kind: 'committed'; commitSha: string }> | Readonly<{ kind: 'conflict' }>;

export interface IWorkspaceFileVersionCommandPort {
  commitFileVersion(
    scope: WorkspaceStorageScope,
    input: CommitWorkspaceFileVersionInput
  ): Promise<WorkspaceFileVersionCommitResult>;
}
