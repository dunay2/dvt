import type { DesignGraphDraft } from '@dvt/contracts';

import type { WorkspaceScope } from '../../ports/sessionContext';
import type { IWorkspacePort, WorkspaceGraphDraft } from '../../ports/workspace';
import type { WorkspaceBootstrapConfig } from '../../services/config/workspaceConfig';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import {
  hasExplicitGitRevision,
  normalizeGitRef,
  readPreviewSqlArtifact,
} from './canvasGitProvenance';
import {
  requireSinkPayload,
  requireSourcePayload,
  requireTransformPayload,
  resolveScopedTransformationNodes,
} from './previewGraphNodePayloads';
import { validateTransformationGraph } from './transformationGraphValidation';

export type CanvasDraftAuthoringPayload = {
  projectedDraft: WorkspaceGraphDraft;
  canonicalNodes: readonly CanonicalNode[];
  canonicalEdges: readonly CanonicalEdge[];
  workspaceScope: WorkspaceScope;
  previewProvenanceConfig: Pick<WorkspaceBootstrapConfig, 'gitBranch' | 'gitSha' | 'gitRepo'>;
};

function hasGitAuthoringContext(
  previewProvenanceConfig: CanvasDraftAuthoringPayload['previewProvenanceConfig']
): previewProvenanceConfig is CanvasDraftAuthoringPayload['previewProvenanceConfig'] & {
  gitRepo: string;
} {
  return (
    typeof previewProvenanceConfig.gitRepo === 'string' &&
    previewProvenanceConfig.gitRepo.trim().length > 0 &&
    hasExplicitGitRevision(previewProvenanceConfig)
  );
}

export function canPersistCanvasDraftAuthoringPayload(
  payload: CanvasDraftAuthoringPayload
): boolean {
  if (!hasGitAuthoringContext(payload.previewProvenanceConfig)) {
    return false;
  }

  const validation = validateTransformationGraph({
    nodes: [...payload.canonicalNodes],
    edges: [...payload.canonicalEdges],
    workspaceNodeIds: payload.projectedDraft.nodeIds,
  });
  if (!validation.valid) {
    return false;
  }

  try {
    const { source, transform, sink } = resolveScopedTransformationNodes(
      payload.canonicalNodes,
      payload.projectedDraft.nodeIds
    );
    requireSourcePayload(source);
    requireSinkPayload(sink);
    return typeof transform.path === 'string' && transform.path.trim().length > 0;
  } catch {
    return false;
  }
}

export async function buildCanvasDraftAuthoringGraph(args: {
  workspaceService: Pick<IWorkspacePort, 'getFileContent'>;
  payload: CanvasDraftAuthoringPayload;
}): Promise<DesignGraphDraft> {
  const { payload, workspaceService } = args;
  if (!hasGitAuthoringContext(payload.previewProvenanceConfig)) {
    throw new Error(
      'Workspace graph draft authoring requires gitRepo, gitBranch, and gitSha to be configured.'
    );
  }

  const { source, transform, sink } = resolveScopedTransformationNodes(
    payload.canonicalNodes,
    payload.projectedDraft.nodeIds
  );
  if (!transform.path) {
    throw new Error('Workspace graph draft authoring requires a transform workspace file path.');
  }
  const { sqlArtifact } = await readPreviewSqlArtifact({
    workspaceService,
    path: transform.path,
    gitRepo: payload.previewProvenanceConfig.gitRepo,
    gitRef: normalizeGitRef(payload.previewProvenanceConfig.gitBranch),
    gitSha: payload.previewProvenanceConfig.gitSha,
  });

  return {
    context: {
      tenantId: payload.workspaceScope.tenantId,
      projectId: payload.workspaceScope.projectId,
      environmentId: payload.workspaceScope.environmentId,
      executionTarget: 'postgres',
    },
    nodes: [
      requireSourcePayload(source),
      requireTransformPayload(transform, sqlArtifact),
      requireSinkPayload(sink),
    ],
    edges: payload.projectedDraft.edges.map((edge) => ({
      fromNodeId: edge.sourceId,
      toNodeId: edge.targetId,
    })),
  };
}
