import { sha256HexUtf8 } from '@dvt/contracts';

import type { PlanPreviewProvenance } from '../../ports/plans';
import type { WorkspaceScope } from '../../ports/sessionContext';
import type { IWorkspacePort } from '../../ports/workspace';
import type { WorkspaceBootstrapConfig } from '../../services/config/workspaceConfig';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';

import {
  hasExplicitGitRevision,
  normalizeGitRef,
  readPreviewSqlArtifact,
} from './canvasGitProvenance';
import { canvasViewCopy } from './copy';
import { buildPreviewDesignGraphArtifactContent } from './previewGraphSource';

export type PreviewProvenanceResolution =
  | {
      ok: true;
      provenance?: PlanPreviewProvenance;
      sqlArtifact?: PlanPreviewProvenance['sqlArtifact'];
      sqlText?: string;
    }
  | { ok: false; message: string };

type PreviewProvenanceConfig = Pick<
  WorkspaceBootstrapConfig,
  'gitBranch' | 'gitSha' | 'gitRepo' | 'graphArtifactPath'
>;

type ResolvePreviewProvenanceArgs = {
  canonicalNodes: readonly CanonicalNode[];
  canonicalEdges: readonly CanonicalEdge[];
  scopedNodeIds: readonly string[];
  workspaceService: IWorkspacePort;
  workspaceScope: WorkspaceScope;
  previewProvenanceConfig: PreviewProvenanceConfig;
  required: boolean;
};

type PreviewWorkspaceConfig = {
  gitRepo: string;
  graphArtifactPath: string;
  gitRef: string;
  gitSha: string;
};

type TransformNodeWithPath = CanonicalNode & { path: string };

function resolveOptionalPreviewFailure(
  required: boolean,
  message: string
): PreviewProvenanceResolution {
  return required ? { ok: false, message } : { ok: true };
}

function resolvePreviewWorkspaceConfig(
  previewProvenanceConfig: PreviewProvenanceConfig
): PreviewWorkspaceConfig | null {
  const { gitRepo, graphArtifactPath, gitBranch, gitSha } = previewProvenanceConfig;
  if (!gitRepo || !graphArtifactPath) {
    return null;
  }
  if (!hasExplicitGitRevision({ gitBranch, gitSha })) {
    return null;
  }

  return {
    gitRepo,
    graphArtifactPath,
    gitRef: normalizeGitRef(gitBranch),
    gitSha,
  };
}

function resolveTransformNodeWithPath(
  nodes: readonly CanonicalNode[],
  scopedNodeIds: readonly string[]
): TransformNodeWithPath | null {
  const transformNode = resolveScopedTransformNode(nodes, scopedNodeIds);
  return transformNode?.path ? { ...transformNode, path: transformNode.path } : null;
}

async function savePreviewGraphArtifact(args: {
  workspaceService: IWorkspacePort;
  workspaceScope: WorkspaceScope;
  graphArtifactPath: string;
  gitRepo: string;
  gitRef: string;
  gitSha: string;
  canonicalNodes: readonly CanonicalNode[];
  canonicalEdges: readonly CanonicalEdge[];
  scopedNodeIds: readonly string[];
  sqlArtifact: PlanPreviewProvenance['sqlArtifact'];
}): Promise<PlanPreviewProvenance['graphArtifact']> {
  const graphArtifactContent = buildPreviewDesignGraphArtifactContent({
    nodes: args.canonicalNodes,
    edges: args.canonicalEdges,
    scopedNodeIds: args.scopedNodeIds,
    sqlArtifact: args.sqlArtifact,
    context: {
      tenantId: args.workspaceScope.tenantId,
      projectId: args.workspaceScope.projectId,
      environmentId: args.workspaceScope.environmentId,
    },
  });
  const graphArtifactFile = await args.workspaceService.saveFileContent(
    args.graphArtifactPath,
    graphArtifactContent
  );

  return {
    repo: args.gitRepo,
    path: args.graphArtifactPath,
    ref: args.gitRef,
    commitSha: args.gitSha,
    contentSha256: sha256HexUtf8(graphArtifactFile.content),
  };
}

export async function resolvePreviewProvenance({
  canonicalNodes,
  canonicalEdges,
  scopedNodeIds,
  workspaceService,
  workspaceScope,
  previewProvenanceConfig,
  required,
}: ResolvePreviewProvenanceArgs): Promise<PreviewProvenanceResolution> {
  const transformNode = resolveTransformNodeWithPath(canonicalNodes, scopedNodeIds);
  if (!transformNode) {
    return resolveOptionalPreviewFailure(
      required,
      canvasViewCopy.previewProvenanceTransformPathRequiredMessage
    );
  }

  const previewWorkspaceConfig = resolvePreviewWorkspaceConfig(previewProvenanceConfig);
  if (!previewWorkspaceConfig) {
    const message = previewProvenanceConfig.gitRepo && previewProvenanceConfig.graphArtifactPath
      ? canvasViewCopy.previewProvenanceExplicitGitRevisionRequiredMessage
      : canvasViewCopy.previewProvenanceWorkspaceNotConfiguredMessage;

    return resolveOptionalPreviewFailure(required, message);
  }

  try {
    const { sqlArtifact, sqlText } = await readPreviewSqlArtifact({
      workspaceService,
      path: transformNode.path,
      gitRepo: previewWorkspaceConfig.gitRepo,
      gitRef: previewWorkspaceConfig.gitRef,
      gitSha: previewWorkspaceConfig.gitSha,
    });
    const graphArtifact = await savePreviewGraphArtifact({
      workspaceService,
      workspaceScope,
      graphArtifactPath: previewWorkspaceConfig.graphArtifactPath,
      gitRepo: previewWorkspaceConfig.gitRepo,
      gitRef: previewWorkspaceConfig.gitRef,
      gitSha: previewWorkspaceConfig.gitSha,
      canonicalNodes,
      canonicalEdges,
      scopedNodeIds,
      sqlArtifact,
    });

    return {
      ok: true,
      sqlArtifact,
      sqlText,
      provenance: {
        graphArtifact,
        sqlArtifact,
      },
    };
  } catch (error) {
    return resolveOptionalPreviewFailure(
      required,
      error instanceof Error
        ? error.message
        : canvasViewCopy.previewProvenanceWorkspaceFilesUnavailableMessage
    );
  }
}

function resolveScopedTransformNode(
  nodes: readonly CanonicalNode[],
  scopedNodeIds: readonly string[]
): CanonicalNode | undefined {
  const scopedNodeIdSet = new Set(scopedNodeIds);
  return nodes.find((node) => scopedNodeIdSet.has(node.id) && node.role === 'transform');
}
