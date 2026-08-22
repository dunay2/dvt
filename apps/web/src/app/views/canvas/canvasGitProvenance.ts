/** Owned concern: read workspace SQL provenance through the file query port. */
import { asSha256HexString } from '@dvt/contracts';
import { sha256HexUtf8 } from '@dvt/crypto';

import type { GitArtifactRef } from '../../ports/plans';
import type {
  ExpectedWorkspaceFileRevision,
  IWorkspaceFilesQueryPort,
} from '../../ports/workspace';
import type { WorkspaceBootstrapConfig } from '../../services/config/workspaceConfig';
import { WorkspaceFileLoadError } from '../../services/workspace/workspaceErrors';

type ReadPreviewSqlArtifactArgs = {
  workspaceFilesQuery: IWorkspaceFilesQueryPort;
  path: string;
  gitRepo: string;
  gitRef: string;
  gitSha: string;
};

export async function readPreviewSqlArtifact({
  workspaceFilesQuery,
  path,
  gitRepo,
  gitRef,
  gitSha,
}: ReadPreviewSqlArtifactArgs): Promise<{
  sqlArtifact: GitArtifactRef;
  sqlText: string;
}> {
  const sqlArtifactFile = await workspaceFilesQuery.getFileContent(path);
  const sqlText = sqlArtifactFile.content;

  return {
    sqlText,
    sqlArtifact: {
      repo: gitRepo,
      path,
      ref: gitRef,
      commitSha: gitSha,
      contentSha256: asSha256HexString(sha256HexUtf8(sqlText)),
    },
  };
}

export async function readExpectedWorkspaceFileRevision(
  workspaceFilesQuery: IWorkspaceFilesQueryPort,
  path: string
): Promise<ExpectedWorkspaceFileRevision> {
  try {
    const file = await workspaceFilesQuery.getFileContent(path);
    return { kind: 'content_sha256', value: file.contentSha256 };
  } catch (error) {
    if (error instanceof WorkspaceFileLoadError && error.kind === 'not_found') {
      return { kind: 'absent' };
    }
    throw error;
  }
}

export function normalizeGitRef(branch: string): string {
  return branch.startsWith('refs/') ? branch : `refs/heads/${branch}`;
}

export function hasExplicitGitRevision({
  gitBranch,
  gitSha,
}: Pick<WorkspaceBootstrapConfig, 'gitBranch' | 'gitSha'>): boolean {
  const normalizedBranch = gitBranch.trim();
  const normalizedSha = gitSha.trim();

  return (
    normalizedBranch.length > 0 &&
    normalizedBranch !== 'detached' &&
    normalizedBranch !== 'unknown' &&
    normalizedSha.length > 0 &&
    normalizedSha !== 'unknown'
  );
}
