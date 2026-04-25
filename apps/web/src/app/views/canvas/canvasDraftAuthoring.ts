/**
 * Owned concern: compose Canvas semantic graph state into the protected
 * workspace authoring draft aggregate.
 *
 * This module builds editable persistence payloads. It does not compile
 * `DesignGraphDraft`, persist directly, or own runtime execution eligibility.
 */
import {
  WorkspaceGraphAuthoringDraftSchema,
  type WorkspaceGraphAuthoringDraft,
  type WorkspaceGraphAuthoringEdge,
  type WorkspaceGraphAuthoringNode,
} from '@dvt/contracts';

import type { WorkspaceScope } from '../../ports/sessionContext';
import type {
  WorkspaceGraphDraft,
  WorkspaceGraphDraftRecord,
} from '../../ports/workspace';
import type { WorkspaceBootstrapConfig } from '../../services/config/workspaceConfig';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import {
  toCanvasAuthoringMetadata,
  toCanvasAuthoringSerializableValue,
} from './canvasAuthoringMetadata';
import { serializeWorkspaceGraphDraftStructuralSignature } from './canvasDraftStructuralSignature';

export type CanvasDraftAuthoringPayload = {
  projectedDraft: WorkspaceGraphDraft;
  canonicalNodes: readonly CanonicalNode[];
  canonicalEdges: readonly CanonicalEdge[];
  workspaceScope: WorkspaceScope;
  previewProvenanceConfig: Pick<WorkspaceBootstrapConfig, 'gitBranch' | 'gitSha' | 'gitRepo'>;
};

export type CanvasDraftAuthoringSignatureInput = Pick<
  CanvasDraftAuthoringPayload,
  'projectedDraft' | 'canonicalNodes' | 'canonicalEdges'
>;

export type CanvasDraftAuthoringBaselineSignatureInput = {
  record: WorkspaceGraphDraftRecord | null;
  semanticGraph: {
    canonicalNodes: readonly CanonicalNode[];
    canonicalEdges: readonly CanonicalEdge[];
  } | null;
};

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
  const metadata = toCanvasAuthoringMetadata(node.metadata);
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
      : { metadata: toCanvasAuthoringMetadata(canonicalEdge.metadata) }),
  };
}

export function canPersistCanvasDraftAuthoringPayload(
  payload: CanvasDraftAuthoringPayload
): boolean {
  try {
    return WorkspaceGraphAuthoringDraftSchema.safeParse(
      buildCanvasDraftAuthoringGraphSync(payload)
    ).success;
  } catch {
    return false;
  }
}

function compareAuthoringEdges(
  left: WorkspaceGraphAuthoringEdge,
  right: WorkspaceGraphAuthoringEdge
): number {
  return (
    left.sourceId.localeCompare(right.sourceId) ||
    left.targetId.localeCompare(right.targetId) ||
    left.relation.localeCompare(right.relation) ||
    left.id.localeCompare(right.id)
  );
}

export function serializeCanvasDraftAuthoringSignature(
  input: CanvasDraftAuthoringSignatureInput
): string {
  const canonicalNodesById = new Map(input.canonicalNodes.map((node) => [node.id, node]));
  const canonicalEdgeLookup = buildCanonicalEdgeLookup(input.canonicalEdges);
  const edges = input.projectedDraft.edges
    .map((edge) => projectDraftEdgeToAuthoringEdge(edge, canonicalEdgeLookup))
    .sort(compareAuthoringEdges);

  const signaturePayload = toCanvasAuthoringSerializableValue({
    canvas: {
      kind: input.projectedDraft.canvas.kind,
      title: input.projectedDraft.canvas.title,
    },
    nodeIds: input.projectedDraft.nodeIds,
    nodes: input.projectedDraft.nodeIds.map((nodeId) => {
      const node = canonicalNodesById.get(nodeId);
      return node == null
        ? {
            id: nodeId,
            missing: true,
          }
        : projectCanonicalNodeToAuthoringNode(node);
    }),
    edges,
  });

  return JSON.stringify(signaturePayload);
}

export function serializeCanvasDraftAuthoringBaselineSignature({
  record,
  semanticGraph,
}: CanvasDraftAuthoringBaselineSignatureInput): string | null {
  if (record == null) {
    return null;
  }

  if (semanticGraph == null) {
    return serializeWorkspaceGraphDraftStructuralSignature(record.draft);
  }

  return serializeCanvasDraftAuthoringSignature({
    projectedDraft: record.draft,
    canonicalNodes: semanticGraph.canonicalNodes,
    canonicalEdges: semanticGraph.canonicalEdges,
  });
}

function buildCanvasDraftAuthoringGraphSync(
  payload: CanvasDraftAuthoringPayload
): WorkspaceGraphAuthoringDraft {
  const canonicalNodesById = new Map(payload.canonicalNodes.map((node) => [node.id, node]));
  const canonicalEdgeLookup = buildCanonicalEdgeLookup(payload.canonicalEdges);

  return {
    canvas: {
      kind: payload.projectedDraft.canvas.kind,
      title: payload.projectedDraft.canvas.title,
    },
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
  payload: CanvasDraftAuthoringPayload;
}): Promise<WorkspaceGraphAuthoringDraft> {
  return buildCanvasDraftAuthoringGraphSync(args.payload);
}
