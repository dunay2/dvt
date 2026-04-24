/** Owned concern: project the protected workspace-graph-draft boundary into route-facing draft and semantic graph models. */
import type {
  WorkspaceGraphAuthoringDraft,
  WorkspaceGraphAuthoringNode,
  WorkspaceGraphDraftRecord as ProtectedWorkspaceGraphDraftRecord,
} from '@dvt/contracts';

import type { WorkspaceGraphDraft, WorkspaceGraphDraftRecord } from '../../ports/workspace';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';

export type WorkspaceGraphDraftSemanticGraph = {
  canonicalNodes: CanonicalNode[];
  canonicalEdges: CanonicalEdge[];
};

function createDraftEdgeId(fromNodeId: string, toNodeId: string): string {
  return `draft_edge_${fromNodeId}_${toNodeId}`;
}

function toPluginNodeKind(node: WorkspaceGraphAuthoringNode): CanonicalNode['kind'] {
  if (node.kind.includes(':')) {
    return node.kind as CanonicalNode['kind'];
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
    canonicalEdges: draft.edges.map((edge) => ({
      id: edge.id || createDraftEdgeId(edge.sourceId, edge.targetId),
      sourceId: edge.sourceId,
      targetId: edge.targetId,
      relation: edge.relation,
      ...(edge.metadata == null ? {} : { metadata: { ...edge.metadata } }),
    })),
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
