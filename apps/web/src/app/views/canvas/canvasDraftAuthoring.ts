import {
  WorkspaceGraphAuthoringDraftSchema,
  type WorkspaceGraphAuthoringDraft,
  type WorkspaceGraphAuthoringEdge,
  type WorkspaceGraphAuthoringNode,
} from '@dvt/contracts';

import type { WorkspaceScope } from '../../ports/sessionContext';
import type { IWorkspacePort, WorkspaceGraphDraft } from '../../ports/workspace';
import type { WorkspaceBootstrapConfig } from '../../services/config/workspaceConfig';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';

export type CanvasDraftAuthoringPayload = {
  projectedDraft: WorkspaceGraphDraft;
  canonicalNodes: readonly CanonicalNode[];
  canonicalEdges: readonly CanonicalEdge[];
  workspaceScope: WorkspaceScope;
  previewProvenanceConfig: Pick<WorkspaceBootstrapConfig, 'gitBranch' | 'gitSha' | 'gitRepo'>;
};

function cloneMetadata(
  metadata: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
  return metadata == null ? undefined : { ...metadata };
}

function projectCanonicalNodeToAuthoringNode(node: CanonicalNode): WorkspaceGraphAuthoringNode {
  const authoringNode: WorkspaceGraphAuthoringNode = {
    id: node.id,
    name: node.name,
    pluginId: node.pluginId,
    kind: node.kind,
    role: node.role,
    status: node.status,
    tags: [...node.tags],
  };

  if (node.path != null) {
    authoringNode.path = node.path;
  }
  if (node.description != null) {
    authoringNode.description = node.description;
  }
  if (node.lastDuration != null) {
    authoringNode.lastDuration = node.lastDuration;
  }
  if (node.lastCost != null) {
    authoringNode.lastCost = node.lastCost;
  }
  const metadata = cloneMetadata(node.metadata);
  if (metadata != null) {
    authoringNode.metadata = metadata;
  }

  return authoringNode;
}

function createAuthoringEdgeId(sourceId: string, targetId: string): string {
  return `draft_edge_${sourceId}_${targetId}`;
}

function buildCanonicalEdgeLookup(
  canonicalEdges: readonly CanonicalEdge[]
): Map<string, CanonicalEdge> {
  return new Map(canonicalEdges.map((edge) => [`${edge.sourceId}::${edge.targetId}`, edge]));
}

function projectDraftEdgeToAuthoringEdge(
  edge: WorkspaceGraphDraft['edges'][number],
  canonicalEdgeLookup: ReadonlyMap<string, CanonicalEdge>
): WorkspaceGraphAuthoringEdge {
  const canonicalEdge = canonicalEdgeLookup.get(`${edge.sourceId}::${edge.targetId}`);
  return {
    id: canonicalEdge?.id ?? createAuthoringEdgeId(edge.sourceId, edge.targetId),
    sourceId: edge.sourceId,
    targetId: edge.targetId,
    relation: canonicalEdge?.relation ?? 'lineage',
    ...(canonicalEdge?.metadata == null
      ? {}
      : { metadata: cloneMetadata(canonicalEdge.metadata) }),
  };
}

export function canPersistCanvasDraftAuthoringPayload(
  payload: CanvasDraftAuthoringPayload
): boolean {
  return WorkspaceGraphAuthoringDraftSchema.safeParse(
    buildCanvasDraftAuthoringGraphSync(payload)
  ).success;
}

function buildCanvasDraftAuthoringGraphSync(
  payload: CanvasDraftAuthoringPayload
): WorkspaceGraphAuthoringDraft {
  const canonicalNodesById = new Map(payload.canonicalNodes.map((node) => [node.id, node]));
  const canonicalEdgeLookup = buildCanonicalEdgeLookup(payload.canonicalEdges);

  return {
    nodeIds: [...payload.projectedDraft.nodeIds],
    nodePositions: { ...payload.projectedDraft.nodePositions },
    nodes: payload.projectedDraft.nodeIds.map((nodeId) => {
      const node = canonicalNodesById.get(nodeId);
      if (node == null) {
        throw new Error(`Workspace graph draft references unknown node ${nodeId}.`);
      }

      return projectCanonicalNodeToAuthoringNode(node);
    }),
    edges: payload.projectedDraft.edges.map((edge) =>
      projectDraftEdgeToAuthoringEdge(edge, canonicalEdgeLookup)
    ),
  };
}

export async function buildCanvasDraftAuthoringGraph(args: {
  workspaceService: Pick<IWorkspacePort, 'getFileContent'>;
  payload: CanvasDraftAuthoringPayload;
}): Promise<WorkspaceGraphAuthoringDraft> {
  return buildCanvasDraftAuthoringGraphSync(args.payload);
}
