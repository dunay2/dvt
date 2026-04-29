/** Owned concern: project the protected workspace-graph-draft boundary into route-facing draft and semantic graph models. */
import type {
  WorkspaceGraphAuthoringDraft,
  WorkspaceGraphAuthoringNode,
  WorkspaceGraphDraftRecord as ProtectedWorkspaceGraphDraftRecord,
} from '@dvt/contracts';

import type { WorkspaceGraphDraft, WorkspaceGraphDraftRecord } from '../../ports/workspace';
import type { CanonicalEdge, CanonicalNode, PluginNodeKind } from '../../types/canonical';

export type WorkspaceGraphDraftSemanticGraph = {
  canonicalNodes: CanonicalNode[];
  canonicalEdges: CanonicalEdge[];
};

function createDraftEdgeId(fromNodeId: string, toNodeId: string): string {
  return `draft_edge_${fromNodeId}_${toNodeId}`;
}

function isPluginNodeKind(value: string): value is PluginNodeKind {
  return value.includes(':');
}

function toPluginNodeKind(node: WorkspaceGraphAuthoringNode): CanonicalNode['kind'] {
  if (isPluginNodeKind(node.kind)) {
    return node.kind;
  }

  return `${node.pluginId}:${node.kind}`;
}

function projectAuthoringNodeToCanonical(node: WorkspaceGraphAuthoringNode): CanonicalNode {
  const canonicalNode: CanonicalNode = {
    id: node.id,
    name: node.name,
    pluginId: node.pluginId,
    kind: toPluginNodeKind(node),
    role: node.role,
    status: node.status,
    tags: [...node.tags],
  };

  if (node.path != null) {
    canonicalNode.path = node.path;
  }
  if (node.description != null) {
    canonicalNode.description = node.description;
  }
  if (node.lastDuration != null) {
    canonicalNode.lastDuration = node.lastDuration;
  }
  if (node.lastCost != null) {
    canonicalNode.lastCost = node.lastCost;
  }
  if (node.metadata != null) {
    canonicalNode.metadata = { ...node.metadata };
  }

  return canonicalNode;
}

function buildCanonicalEdgeProjection(
  edge: WorkspaceGraphAuthoringDraft['edges'][number]
): CanonicalEdge {
  const canonicalEdge: CanonicalEdge = {
    id: edge.id || createDraftEdgeId(edge.sourceId, edge.targetId),
    sourceId: edge.sourceId,
    targetId: edge.targetId,
    relation: edge.relation,
  };

  if (edge.metadata != null) {
    canonicalEdge.metadata = { ...edge.metadata };
  }

  return canonicalEdge;
}

export function projectWorkspaceGraphAuthoringDraft(
  draft: WorkspaceGraphAuthoringDraft
): WorkspaceGraphDraft {
  return {
    canvas: {
      kind: draft.canvas.kind,
      title: draft.canvas.title,
    },
    nodeIds: [...draft.nodeIds],
    nodePositions: { ...draft.nodePositions },
    edges: draft.edges.map((edge) => ({
      sourceId: edge.sourceId,
      targetId: edge.targetId,
    })),
  };
}

export function projectWorkspaceGraphAuthoringDraftSemanticGraph(
  draft: WorkspaceGraphAuthoringDraft
): WorkspaceGraphDraftSemanticGraph {
  return {
    canonicalNodes: draft.nodes.map((node) => projectAuthoringNodeToCanonical(node)),
    canonicalEdges: draft.edges.map((edge) => buildCanonicalEdgeProjection(edge)),
  };
}

export function projectProtectedWorkspaceGraphDraftRecord(
  record: ProtectedWorkspaceGraphDraftRecord
): WorkspaceGraphDraftRecord {
  return {
    revision: record.revision,
    savedAt: record.updatedAt,
    draft: projectWorkspaceGraphAuthoringDraft(record.draft),
  };
}
