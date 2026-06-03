/**
 * Owned concern: define protected workspace file-history read models and the
 * outbound repository port for file-scoped Git history queries.
 */

export type WorkspaceFileHistoryEntry = {
  readonly commitSha: string;
  readonly shortSha: string;
  readonly authorName: string;
  readonly authoredAt: string;
  readonly subject: string;
  readonly path: string;
};

export interface IWorkspaceFileHistoryRepository {
  listFileHistory(path: string): Promise<readonly WorkspaceFileHistoryEntry[]>;
}
