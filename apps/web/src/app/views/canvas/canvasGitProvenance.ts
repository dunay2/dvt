import { sha256HexUtf8 } from '@dvt/contracts';

import type { PlanPreviewProvenance } from '../../ports/plans';
import type { IWorkspacePort } from '../../ports/workspace';
import type { WorkspaceBootstrapConfig } from '../../services/config/workspaceConfig';

type ReadPreviewSqlArtifactArgs = {
  workspaceService: Pick<IWorkspacePort, 'getFileContent'>;
  path: string;
  gitRepo: string;
  gitRef: string;
  gitSha: string;
};

export async function readPreviewSqlArtifact({
  workspaceService,
  path,
  gitRepo,
  gitRef,
  gitSha,
}: ReadPreviewSqlArtifactArgs): Promise<{
  sqlArtifact: PlanPreviewProvenance['sqlArtifact'];
  sqlText: string;
}> {
  const sqlArtifactFile = await workspaceService.getFileContent(path);
  const sqlText = sqlArtifactFile.content;

  return {
    sqlText,
    sqlArtifact: {
      repo: gitRepo,
      path,
      ref: gitRef,
      commitSha: gitSha,
      contentSha256: sha256HexUtf8(sqlText),
    },
  };
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
