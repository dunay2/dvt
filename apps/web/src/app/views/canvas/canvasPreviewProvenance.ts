/** Owned concern: resolve plan preview provenance through workspace file read/write ports. */
import { sha256HexUtf8 } from '@dvt/contracts';

import type { PlanPreviewProvenance } from '../../ports/plans';
import type { WorkspaceScope } from '../../ports/sessionContext';
import type {
  IWorkspaceFileContentCommandPort,
  IWorkspaceFilesQueryPort,
} from '../../ports/workspace';
import type { WorkspaceBootstrapConfig } from '../../services/config/workspaceConfig';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';

import {
  hasExplicitGitRevision,
  normalizeGitRef,
  readPreviewSqlArtifact,
} from './canvasGitProvenance';
import { canvasViewCopy } from './copy';
import { buildPreviewDesignGraphArtifactContent } from './previewGraphSource';
import {
  isCanvasAuthoringNode,
  requireSourcePayload,
  resolveAuthoringSqlArtifactPath,
  resolveScopedTransformationNodes,
} from './previewGraphNodePayloads';

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
  workspaceFilesQuery: IWorkspaceFilesQueryPort;
  workspaceFileContentCommand: IWorkspaceFileContentCommandPort;
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

type TransformArtifactSource = {
  kind: 'workspace-file' | 'authoring-generated';
  node: CanonicalNode;
  path: string;
};

function resolveOptionalPreviewFailure(
  required: boolean,
  message: string
): PreviewProvenanceResolution {
  return required ? { ok: false, message } : { ok: true };
}

function resolvePreviewWorkspaceConfig({
  previewProvenanceConfig,
  workspaceScope,
  allowLocalDraft,
}: {
  previewProvenanceConfig: PreviewProvenanceConfig;
  workspaceScope: WorkspaceScope;
  allowLocalDraft: boolean;
}): PreviewWorkspaceConfig | null {
  const { gitRepo, graphArtifactPath, gitBranch, gitSha } = previewProvenanceConfig;
  if (gitRepo && graphArtifactPath && hasExplicitGitRevision({ gitBranch, gitSha })) {
    return {
      gitRepo,
      graphArtifactPath,
      gitRef: normalizeGitRef(gitBranch),
      gitSha,
    };
  }

  if (!allowLocalDraft) {
    return null;
  }

  return {
    gitRepo: `workspace://${workspaceScope.tenantId}/${workspaceScope.projectId}`,
    graphArtifactPath:
      normalizeNonBlankString(graphArtifactPath) ??
      `pipelines/${slugifyPathSegment(workspaceScope.projectId)}-transformation-preview.yaml`,
    gitRef: `workspace/${workspaceScope.environmentId}`,
    gitSha: 'workspace-draft',
  };
}

function resolveTransformArtifactSource(
  nodes: readonly CanonicalNode[],
  scopedNodeIds: readonly string[]
): TransformArtifactSource | null {
  const transformNode = resolveScopedTransformNode(nodes, scopedNodeIds);
  if (!transformNode) {
    return null;
  }

  const workspacePath = normalizeNonBlankString(transformNode.path);
  if (workspacePath) {
    return {
      kind: 'workspace-file',
      node: transformNode,
      path: workspacePath,
    };
  }

  if (!isCanvasAuthoringNode(transformNode)) {
    return null;
  }

  return {
    kind: 'authoring-generated',
    node: transformNode,
    path: resolveAuthoringSqlArtifactPath(transformNode),
  };
}

async function savePreviewGraphArtifact(args: {
  workspaceFileContentCommand: IWorkspaceFileContentCommandPort;
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
  const graphArtifactFile = await args.workspaceFileContentCommand.saveFileContent(
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

async function resolvePreviewSqlArtifact(args: {
  transformArtifactSource: TransformArtifactSource;
  canonicalNodes: readonly CanonicalNode[];
  scopedNodeIds: readonly string[];
  workspaceFilesQuery: IWorkspaceFilesQueryPort;
  workspaceFileContentCommand: IWorkspaceFileContentCommandPort;
  gitRepo: string;
  gitRef: string;
  gitSha: string;
}): Promise<{
  sqlArtifact: PlanPreviewProvenance['sqlArtifact'];
  sqlText: string;
}> {
  const { transformArtifactSource } = args;

  if (transformArtifactSource.kind === 'workspace-file') {
    try {
      return await readPreviewSqlArtifact({
        workspaceFilesQuery: args.workspaceFilesQuery,
        path: transformArtifactSource.path,
        gitRepo: args.gitRepo,
        gitRef: args.gitRef,
        gitSha: args.gitSha,
      });
    } catch (error) {
      if (!isCanvasAuthoringNode(transformArtifactSource.node)) {
        throw error;
      }
    }
  }

  const sqlText = buildAuthoringPreviewSql({
    transformNode: transformArtifactSource.node,
    canonicalNodes: args.canonicalNodes,
    scopedNodeIds: args.scopedNodeIds,
  });
  const savedSqlArtifact = await args.workspaceFileContentCommand.saveFileContent(
    transformArtifactSource.path,
    sqlText
  );

  return {
    sqlText: savedSqlArtifact.content,
    sqlArtifact: {
      repo: args.gitRepo,
      path: transformArtifactSource.path,
      ref: args.gitRef,
      commitSha: args.gitSha,
      contentSha256: sha256HexUtf8(savedSqlArtifact.content),
    },
  };
}

function buildAuthoringPreviewSql({
  transformNode,
  canonicalNodes,
  scopedNodeIds,
}: {
  transformNode: CanonicalNode;
  canonicalNodes: readonly CanonicalNode[];
  scopedNodeIds: readonly string[];
}): string {
  const explicitSql = readNodeSqlText(transformNode);
  if (explicitSql) {
    return explicitSql.endsWith('\n') ? explicitSql : `${explicitSql}\n`;
  }

  const scopedNodes = resolveScopedTransformationNodes(canonicalNodes, scopedNodeIds);
  const source = requireSourcePayload(scopedNodes.source);

  return `select *\nfrom ${source.payload.schema}.${source.payload.table};\n`;
}

function readNodeSqlText(node: CanonicalNode): string | null {
  const compiledSql = node.metadata?.compiledSql;
  if (typeof compiledSql === 'string' && compiledSql.trim().length > 0) {
    return compiledSql.trim();
  }

  const sql = node.metadata?.sql;
  if (typeof sql === 'string' && sql.trim().length > 0) {
    return sql.trim();
  }

  return null;
}

export async function resolvePreviewProvenance({
  canonicalNodes,
  canonicalEdges,
  scopedNodeIds,
  workspaceFilesQuery,
  workspaceFileContentCommand,
  workspaceScope,
  previewProvenanceConfig,
  required,
}: ResolvePreviewProvenanceArgs): Promise<PreviewProvenanceResolution> {
  const transformArtifactSource = resolveTransformArtifactSource(canonicalNodes, scopedNodeIds);
  if (!transformArtifactSource) {
    return resolveOptionalPreviewFailure(
      required,
      canvasViewCopy.previewProvenanceTransformPathRequiredMessage
    );
  }

  const previewWorkspaceConfig = resolvePreviewWorkspaceConfig({
    previewProvenanceConfig,
    workspaceScope,
    allowLocalDraft: transformArtifactSource.kind === 'authoring-generated',
  });
  if (!previewWorkspaceConfig) {
    const message =
      previewProvenanceConfig.gitRepo && previewProvenanceConfig.graphArtifactPath
        ? canvasViewCopy.previewProvenanceExplicitGitRevisionRequiredMessage
        : canvasViewCopy.previewProvenanceWorkspaceNotConfiguredMessage;

    return resolveOptionalPreviewFailure(required, message);
  }

  try {
    const { sqlArtifact, sqlText } = await resolvePreviewSqlArtifact({
      transformArtifactSource,
      canonicalNodes,
      scopedNodeIds,
      workspaceFilesQuery,
      workspaceFileContentCommand,
      gitRepo: previewWorkspaceConfig.gitRepo,
      gitRef: previewWorkspaceConfig.gitRef,
      gitSha: previewWorkspaceConfig.gitSha,
    });
    const graphArtifact = await savePreviewGraphArtifact({
      workspaceFileContentCommand,
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

function normalizeNonBlankString(value: string | undefined): string | null {
  const normalized = value?.trim();

  return normalized && normalized.length > 0 ? normalized : null;
}

function slugifyPathSegment(value: string): string {
  const words: string[] = [];
  let currentWord = '';

  for (const character of value) {
    if (isAsciiAlphaNumeric(character)) {
      currentWord += character.toLowerCase();
      continue;
    }

    if (currentWord.length > 0) {
      words.push(currentWord);
      currentWord = '';
    }
  }

  if (currentWord.length > 0) {
    words.push(currentWord);
  }

  return words.join('-') || 'project';
}

function isAsciiAlphaNumeric(character: string): boolean {
  const codePoint = character.codePointAt(0);
  if (codePoint == null) {
    return false;
  }

  return (
    (codePoint >= 48 && codePoint <= 57) ||
    (codePoint >= 65 && codePoint <= 90) ||
    (codePoint >= 97 && codePoint <= 122)
  );
}
