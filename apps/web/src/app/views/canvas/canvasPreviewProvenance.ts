import { sha256HexUtf8 } from '@dvt/contracts';

import type { PlanPreviewProvenance } from '../../ports/plans';
import type { WorkspaceScope } from '../../ports/sessionContext';
import type { IWorkspacePort } from '../../ports/workspace';
import type { WorkspaceBootstrapConfig } from '../../services/config/workspaceConfig';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';

import { buildPreviewDesignGraphArtifactContent } from './previewGraphSource';

export type PreviewProvenanceResolution =
  | {
      ok: true;
      provenance?: PlanPreviewProvenance;
      sqlArtifact?: PlanPreviewProvenance['sqlArtifact'];
      sqlText?: string;
    }
  | { ok: false; message: string };

export async function resolvePreviewProvenance({
  canonicalNodes,
  canonicalEdges,
  scopedNodeIds,
  workspaceService,
  workspaceScope,
  previewProvenanceConfig,
  required,
}: {
  canonicalNodes: readonly CanonicalNode[];
  canonicalEdges: readonly CanonicalEdge[];
  scopedNodeIds: readonly string[];
  workspaceService: IWorkspacePort;
  workspaceScope: WorkspaceScope;
  previewProvenanceConfig: Pick<
    WorkspaceBootstrapConfig,
    'gitBranch' | 'gitSha' | 'gitRepo' | 'graphArtifactPath'
  >;
  required: boolean;
}): Promise<PreviewProvenanceResolution> {
  const transformNode = resolveScopedTransformNode(canonicalNodes, scopedNodeIds);
  if (!transformNode?.path) {
    if (!required) {
      return { ok: true };
    }
    return {
      ok: false,
      message:
        'Preview provenance requires one SQL transform node with a workspace file path before planning.',
    };
  }

  const { gitRepo, graphArtifactPath, gitBranch, gitSha } = previewProvenanceConfig;
  if (!gitRepo || !graphArtifactPath) {
    if (!required) {
      return { ok: true };
    }
    return {
      ok: false,
      message:
        'Preview provenance is not configured for this workspace. Set the Git repo and graph artifact path before planning.',
    };
  }
  if (!hasExplicitGitRevision({ gitBranch, gitSha })) {
    if (!required) {
      return { ok: true };
    }
    return {
      ok: false,
      message: 'Preview provenance requires an explicit Git branch and commit before planning.',
    };
  }

  try {
    const sqlArtifactFile = await workspaceService.getFileContent(transformNode.path);
    const sqlText = sqlArtifactFile.content;
    const sqlArtifact = {
      repo: gitRepo,
      path: transformNode.path,
      ref: normalizeGitRef(gitBranch),
      commitSha: gitSha,
      contentSha256: sha256HexUtf8(sqlText),
    } satisfies PlanPreviewProvenance['sqlArtifact'];
    const graphArtifactContent = buildPreviewDesignGraphArtifactContent({
      nodes: canonicalNodes,
      edges: canonicalEdges,
      scopedNodeIds,
      sqlArtifact,
      context: {
        tenantId: workspaceScope.tenantId,
        projectId: workspaceScope.projectId,
        environmentId: workspaceScope.environmentId,
      },
    });
    const graphArtifactFile = await workspaceService.saveFileContent(
      graphArtifactPath,
      graphArtifactContent
    );

    return {
      ok: true,
      sqlArtifact,
      sqlText,
      provenance: {
        graphArtifact: {
          repo: gitRepo,
          path: graphArtifactPath,
          ref: normalizeGitRef(gitBranch),
          commitSha: gitSha,
          contentSha256: sha256HexUtf8(graphArtifactFile.content),
        },
        sqlArtifact,
      },
    };
  } catch (error) {
    if (!required) {
      return { ok: true };
    }
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : 'Preview provenance could not be resolved from the workspace files.',
    };
  }
}

function normalizeGitRef(branch: string): string {
  return branch.startsWith('refs/') ? branch : `refs/heads/${branch}`;
}

function hasExplicitGitRevision({
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

function resolveScopedTransformNode(
  nodes: readonly CanonicalNode[],
  scopedNodeIds: readonly string[]
): CanonicalNode | undefined {
  const scopedNodeIdSet = new Set(scopedNodeIds);
  return nodes.find((node) => scopedNodeIdSet.has(node.id) && node.role === 'transform');
}
