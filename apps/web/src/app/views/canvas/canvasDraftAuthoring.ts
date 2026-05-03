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

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { toCanvasAuthoringMetadata } from './canvasAuthoringMetadata';
import type { CanvasAuthoringDraftRecord } from './canvasDraftReadModel';
import { serializeWorkspaceGraphAuthoringDraftStructuralSignature } from './canvasDraftStructuralSignature';

export type CanvasAuthoringDraftBuildInput = {
  canvas: WorkspaceGraphAuthoringDraft['canvas'];
  nodeIds: readonly string[];
  nodePositions: WorkspaceGraphAuthoringDraft['nodePositions'];
  visibleEdges: ReadonlyArray<Pick<WorkspaceGraphAuthoringEdge, 'sourceId' | 'targetId'>>;
  canonicalNodes: readonly CanonicalNode[];
  canonicalEdges: readonly CanonicalEdge[];
};

export type CanvasDraftAuthoringSignatureInput = WorkspaceGraphAuthoringDraft;

export type CanvasDraftAuthoringBaselineSignatureInput = {
  record: CanvasAuthoringDraftRecord | null;
};

function toWorkspaceGraphAuthoringNodeKind(node: CanonicalNode): string {
  const pluginPrefix = `${node.pluginId}:`;
  return node.kind.startsWith(pluginPrefix) ? node.kind.slice(pluginPrefix.length) : node.kind;
}

export function projectCanonicalNodeToAuthoringNode(
  node: CanonicalNode
): WorkspaceGraphAuthoringNode {
  const authoringNode: WorkspaceGraphAuthoringNode = {
    id: node.id,
    name: node.name,
    pluginId: node.pluginId,
    kind: toWorkspaceGraphAuthoringNodeKind(node),
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
  edge: Pick<WorkspaceGraphAuthoringEdge, 'sourceId' | 'targetId'>,
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

export function canPersistWorkspaceGraphAuthoringDraft(
  draft: WorkspaceGraphAuthoringDraft
): boolean {
  try {
    return WorkspaceGraphAuthoringDraftSchema.safeParse(draft).success;
  } catch {
    return false;
  }
}

export function serializeCanvasDraftAuthoringSignature(
  input: CanvasDraftAuthoringSignatureInput
): string {
  return serializeWorkspaceGraphAuthoringDraftStructuralSignature(input);
}

export function serializeCanvasDraftAuthoringBaselineSignature({
  record,
}: CanvasDraftAuthoringBaselineSignatureInput): string | null {
  if (record == null) {
    return null;
  }

  return serializeWorkspaceGraphAuthoringDraftStructuralSignature(record.draft);
}

export function buildCanvasAuthoringDraft(
  input: CanvasAuthoringDraftBuildInput
): WorkspaceGraphAuthoringDraft {
  const canonicalNodesById = new Map(input.canonicalNodes.map((node) => [node.id, node]));
  const canonicalEdgeLookup = buildCanonicalEdgeLookup(input.canonicalEdges);

  return {
    canvas: {
      kind: input.canvas.kind,
      title: input.canvas.title,
    },
    nodeIds: [...input.nodeIds],
    nodePositions: { ...input.nodePositions },
    nodes: input.nodeIds.map((nodeId) => {
      const node = canonicalNodesById.get(nodeId);
      if (node == null) {
        throw new Error(`Workspace graph draft references unknown node ${nodeId}.`);
      }

      return projectCanonicalNodeToAuthoringNode(node);
    }),
    edges: input.visibleEdges.map((edge) =>
      projectDraftEdgeToAuthoringEdge(edge, canonicalEdgeLookup)
    ),
  };
}
