/** Owned concern: resolve plan preview provenance through workspace file read/write ports. */
import type { GitArtifactRef, TransformationGitArtifactsProvenance } from '@dvt/contracts';
import { DVT_TRANSFORM_AUTHORING_MODE, asSha256HexString } from '@dvt/contracts';
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
  readExpectedWorkspaceFileRevision,
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
import {
  readTransformationSqlMirrorState,
  resolveExecutableSqlText,
} from './canvasTransformationSqlMirror';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';
import {
  decodeDvtSubstraitPilotDocument,
  inspectDvtSubstraitPilotDraft,
} from './canvasDvtSubstraitPilot';
import {
  decodeDvtSubstraitProjectionDocument,
  resolveDvtSubstraitProjectionEntry,
} from './canvasDvtSubstraitProjection';
import { inspectDvtSubstraitPilotAggregationDraft } from './canvasDvtSubstraitAggregation';
import { inspectDvtSubstraitPilotAggregateWindowDraft } from './canvasDvtSubstraitAggregateWindow';
import { inspectDvtSubstraitPilotWindowDraft } from './canvasDvtSubstraitWindow';
import {
  decodeDvtSubstraitInnerJoinDocument,
  inspectDvtSubstraitInnerJoinAcceptedDraft,
  resolveDvtSubstraitInnerJoinEntry,
  resolveDvtSubstraitNInputJoinEntry,
} from './canvasDvtSubstraitJoinComposition';
import {
  decodeDvtSubstraitUnionAllDocument,
  inspectDvtSubstraitUnionAllAcceptedDraft,
  resolveDvtSubstraitUnionAllEntry,
} from './canvasDvtSubstraitSetComposition';
import {
  projectDvtSubstraitPilotAggregationToPostgresSql,
  projectDvtSubstraitPilotAggregateWindowToPostgresSql,
  projectDvtSubstraitPilotWindowToPostgresSql,
  projectDvtSubstraitInnerJoinToPostgresSql,
  projectDvtSubstraitPilotToPostgresSql,
  projectDvtSubstraitProjectionToPostgresSql,
  projectDvtSubstraitUnionAllToPostgresSql,
} from './canvasDvtSubstraitPostgresProjection';
import { compileDvtVisualTransformNodeToPostgresSql } from './canvasVisualTransformSql';

export type PreviewProvenanceResolution =
  | {
      ok: true;
      provenance?: TransformationGitArtifactsProvenance;
      sqlArtifact?: GitArtifactRef;
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
  if (transformNode.pluginId === 'dvt' && transformNode.kind === 'dvt:transform') {
    const authority = readDvtTransformAuthoringAuthority(transformNode);
    if (
      authority.mode === DVT_TRANSFORM_AUTHORING_MODE.visual ||
      authority.mode === DVT_TRANSFORM_AUTHORING_MODE.substrait
    ) {
      return {
        kind: 'authoring-generated',
        node: transformNode,
        path: workspacePath ?? resolveAuthoringSqlArtifactPath(transformNode),
      };
    }
  }
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
  workspaceFilesQuery: IWorkspaceFilesQueryPort;
  workspaceScope: WorkspaceScope;
  graphArtifactPath: string;
  gitRepo: string;
  gitRef: string;
  gitSha: string;
  canonicalNodes: readonly CanonicalNode[];
  canonicalEdges: readonly CanonicalEdge[];
  scopedNodeIds: readonly string[];
  sqlArtifact: GitArtifactRef;
}): Promise<GitArtifactRef> {
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
  const graphArtifactReceipt = await args.workspaceFileContentCommand.saveFileContent({
    path: args.graphArtifactPath,
    content: graphArtifactContent,
    expectedRevision: await readExpectedWorkspaceFileRevision(
      args.workspaceFilesQuery,
      args.graphArtifactPath
    ),
  });

  return {
    repo: args.gitRepo,
    path: args.graphArtifactPath,
    ref: args.gitRef,
    commitSha: args.gitSha,
    contentSha256: asSha256HexString(graphArtifactReceipt.contentSha256),
  };
}

async function resolvePreviewSqlArtifact(args: {
  transformArtifactSource: TransformArtifactSource;
  canonicalNodes: readonly CanonicalNode[];
  canonicalEdges: readonly CanonicalEdge[];
  scopedNodeIds: readonly string[];
  workspaceFilesQuery: IWorkspaceFilesQueryPort;
  workspaceFileContentCommand: IWorkspaceFileContentCommandPort;
  gitRepo: string;
  gitRef: string;
  gitSha: string;
}): Promise<{
  sqlArtifact: GitArtifactRef;
  sqlText: string;
}> {
  const { transformArtifactSource } = args;

  if (transformArtifactSource.kind === 'workspace-file') {
    const draftSqlText = readTransformationSqlMirrorState(transformArtifactSource.node).draftSql;
    if (draftSqlText) {
      const sqlText = draftSqlText.endsWith('\n') ? draftSqlText : `${draftSqlText}\n`;
      const savedSqlArtifactReceipt = await args.workspaceFileContentCommand.saveFileContent({
        path: transformArtifactSource.path,
        content: sqlText,
        expectedRevision: await readExpectedWorkspaceFileRevision(
          args.workspaceFilesQuery,
          transformArtifactSource.path
        ),
      });

      return {
        sqlText,
        sqlArtifact: {
          repo: args.gitRepo,
          path: transformArtifactSource.path,
          ref: args.gitRef,
          commitSha: args.gitSha,
          contentSha256: asSha256HexString(savedSqlArtifactReceipt.contentSha256),
        },
      };
    }

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

  const sqlText = await buildAuthoringPreviewSql({
    transformNode: transformArtifactSource.node,
    canonicalNodes: args.canonicalNodes,
    canonicalEdges: args.canonicalEdges,
    scopedNodeIds: args.scopedNodeIds,
  });
  const savedSqlArtifactReceipt = await args.workspaceFileContentCommand.saveFileContent({
    path: transformArtifactSource.path,
    content: sqlText,
    expectedRevision: await readExpectedWorkspaceFileRevision(
      args.workspaceFilesQuery,
      transformArtifactSource.path
    ),
  });

  return {
    sqlText,
    sqlArtifact: {
      repo: args.gitRepo,
      path: transformArtifactSource.path,
      ref: args.gitRef,
      commitSha: args.gitSha,
      contentSha256: asSha256HexString(savedSqlArtifactReceipt.contentSha256),
    },
  };
}

async function buildAuthoringPreviewSql({
  transformNode,
  canonicalNodes,
  canonicalEdges,
  scopedNodeIds,
}: {
  transformNode: CanonicalNode;
  canonicalNodes: readonly CanonicalNode[];
  canonicalEdges: readonly CanonicalEdge[];
  scopedNodeIds: readonly string[];
}): Promise<string> {
  if (transformNode.pluginId === 'dvt' && transformNode.kind === 'dvt:transform') {
    const authority = readDvtTransformAuthoringAuthority(transformNode);
    if (authority.mode === DVT_TRANSFORM_AUTHORING_MODE.visual) {
      const scopedNodes = resolveScopedTransformationNodes(canonicalNodes, scopedNodeIds);
      return compileDvtVisualTransformNodeToPostgresSql({
        transformNode,
        sourceNode: scopedNodes.source,
      });
    }
    if (authority.mode === DVT_TRANSFORM_AUTHORING_MODE.substrait) {
      const scopedNodeIdSet = new Set(scopedNodeIds);
      const scopedNodes = canonicalNodes.filter((node) => scopedNodeIdSet.has(node.id));
      const scopedEdges = canonicalEdges.filter(
        (edge) => scopedNodeIdSet.has(edge.sourceId) && scopedNodeIdSet.has(edge.targetId)
      );
      const projectionDraft = decodeDvtSubstraitProjectionDocument(authority.semanticDocument);
      const projectionEntry = resolveDvtSubstraitProjectionEntry({
        targetNode: transformNode,
        nodes: scopedNodes,
        edges: scopedEdges,
        draft: projectionDraft,
      });
      if (projectionEntry != null) {
        const sql = await projectDvtSubstraitProjectionToPostgresSql(projectionDraft);
        return sql.endsWith('\n') ? sql : `${sql}\n`;
      }

      const pilotDraft = decodeDvtSubstraitPilotDocument(authority.semanticDocument);
      if (inspectDvtSubstraitPilotDraft(pilotDraft).ok) {
        const scopedNodes = resolveScopedTransformationNodes(canonicalNodes, scopedNodeIds);
        const source = requireSourcePayload(scopedNodes.source);
        const sql = await projectDvtSubstraitPilotToPostgresSql(pilotDraft, {
          schema: source.payload.schema,
          table: source.payload.table,
        });
        return sql.endsWith('\n') ? sql : `${sql}\n`;
      }

      if (inspectDvtSubstraitPilotAggregateWindowDraft(pilotDraft).ok) {
        const scopedNodes = resolveScopedTransformationNodes(canonicalNodes, scopedNodeIds);
        const source = requireSourcePayload(scopedNodes.source);
        const sql = await projectDvtSubstraitPilotAggregateWindowToPostgresSql(pilotDraft, {
          schema: source.payload.schema,
          table: source.payload.table,
        });
        return sql.endsWith('\n') ? sql : `${sql}\n`;
      }

      if (inspectDvtSubstraitPilotAggregationDraft(pilotDraft).ok) {
        const scopedNodes = resolveScopedTransformationNodes(canonicalNodes, scopedNodeIds);
        const source = requireSourcePayload(scopedNodes.source);
        const sql = await projectDvtSubstraitPilotAggregationToPostgresSql(pilotDraft, {
          schema: source.payload.schema,
          table: source.payload.table,
        });
        return sql.endsWith('\n') ? sql : `${sql}\n`;
      }

      if (inspectDvtSubstraitPilotWindowDraft(pilotDraft).ok) {
        const scopedNodes = resolveScopedTransformationNodes(canonicalNodes, scopedNodeIds);
        const source = requireSourcePayload(scopedNodes.source);
        const sql = await projectDvtSubstraitPilotWindowToPostgresSql(pilotDraft, {
          schema: source.payload.schema,
          table: source.payload.table,
        });
        return sql.endsWith('\n') ? sql : `${sql}\n`;
      }

      const joinDraft = decodeDvtSubstraitInnerJoinDocument(authority.semanticDocument);
      const joinInspection = inspectDvtSubstraitInnerJoinAcceptedDraft(joinDraft);
      if (joinInspection.ok) {
        const joinEntry =
          'left' in joinInspection.projection && 'right' in joinInspection.projection
            ? resolveDvtSubstraitInnerJoinEntry({
                targetNode: transformNode,
                nodes: scopedNodes,
                edges: scopedEdges,
                requirePersistedAuthority: true,
              })
            : resolveDvtSubstraitNInputJoinEntry({
                targetNode: transformNode,
                nodes: scopedNodes,
                edges: scopedEdges,
                draft: joinDraft,
              });
        if (joinEntry == null) {
          throw new Error(
            'Substrait INNER JOIN Preview source identities do not match the scoped graph.'
          );
        }
        const sql = await projectDvtSubstraitInnerJoinToPostgresSql(joinDraft);
        return sql.endsWith('\n') ? sql : `${sql}\n`;
      }

      const unionAllDraft = decodeDvtSubstraitUnionAllDocument(authority.semanticDocument);
      const unionAllInspection = inspectDvtSubstraitUnionAllAcceptedDraft(unionAllDraft);
      if (!unionAllInspection.ok) {
        throw new Error('Preview does not support this Substrait semantic shape.');
      }
      const unionAllEntry = resolveDvtSubstraitUnionAllEntry({
        targetNode: transformNode,
        nodes: scopedNodes,
        edges: scopedEdges,
        requirePersistedAuthority: true,
      });
      if (unionAllEntry == null) {
        throw new Error(
          'Substrait UNION ALL Preview source identities do not match the scoped graph.'
        );
      }
      const sql = await projectDvtSubstraitUnionAllToPostgresSql(unionAllDraft);
      return sql.endsWith('\n') ? sql : `${sql}\n`;
    }
  }

  const explicitSql = resolveExecutableSqlText(transformNode);
  if (!explicitSql.ok) {
    throw new Error(explicitSql.message);
  }

  if (explicitSql.sql) {
    return explicitSql.sql.endsWith('\n') ? explicitSql.sql : `${explicitSql.sql}\n`;
  }

  const scopedNodes = resolveScopedTransformationNodes(canonicalNodes, scopedNodeIds);
  const source = requireSourcePayload(scopedNodes.source);

  return `select *\nfrom ${source.payload.schema}.${source.payload.table};\n`;
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
      canonicalEdges,
      scopedNodeIds,
      workspaceFilesQuery,
      workspaceFileContentCommand,
      gitRepo: previewWorkspaceConfig.gitRepo,
      gitRef: previewWorkspaceConfig.gitRef,
      gitSha: previewWorkspaceConfig.gitSha,
    });
    const graphArtifact = await savePreviewGraphArtifact({
      workspaceFileContentCommand,
      workspaceFilesQuery,
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
        kind: 'transformation-git-artifacts',
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
