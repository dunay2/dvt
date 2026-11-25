/**
 * Owned concern: compose Canvas semantic graph state into the protected
 * workspace authoring draft aggregate.
 *
 * This module builds editable persistence payloads. It does not compile
 * execution plans, persist directly, or own runtime execution eligibility.
 */
import {
  WorkspaceGraphAuthoringDraftSchema,
  withWorkspaceGraphAuthoringEdgeExecutionGate,
  workspaceNodeDefinitionId,
  type WorkspaceGraphAuthoringDraft,
  type WorkspaceGraphAuthoringEdge,
  type WorkspaceGraphAuthoringNode,
} from '@dvt/contracts';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { toCanvasAuthoringMetadata } from './canvasAuthoringMetadata';
import type { CanvasAuthoringDraftRecord } from './canvasDraftReadModel';
import {
  serializeWorkspaceGraphAuthoringDraftStructuralSignature,
  toWorkspaceGraphAuthoringNodeKind,
} from './canvasDraftStructuralSignature';
import type { CanvasDraftEdge } from './canvasDraftSession.types';
import { isDbtCompatibleModel, isDbtCompatibleSource } from './canvasDbtAuthoringModel';

export type CanvasAuthoringDraftBuildInput = {
  canvas: WorkspaceGraphAuthoringDraft['canvas'];
  nodeIds: readonly string[];
  nodePositions: WorkspaceGraphAuthoringDraft['nodePositions'];
  visibleEdges: readonly CanvasDraftEdge[];
  canonicalNodes: readonly CanonicalNode[];
  canonicalEdges: readonly CanonicalEdge[];
};

export type CanvasDraftAuthoringSignatureInput = WorkspaceGraphAuthoringDraft;

export type CanvasDraftAuthoringBaselineSignatureInput = {
  record: CanvasAuthoringDraftRecord | null;
};

export function projectCanonicalNodeToAuthoringNode(
  node: CanonicalNode
): WorkspaceGraphAuthoringNode {
  const authoringNode: WorkspaceGraphAuthoringNode = {
    id: node.id,
    ...(node.sourceDefinitionId == null ? {} : { sourceDefinitionId: node.sourceDefinitionId }),
    ...(node.definitionId == null ? {} : { definitionId: node.definitionId }),
    name: node.name,
    pluginId: node.pluginId,
    kind: toWorkspaceGraphAuthoringNodeKind(node),
    role: node.role,
    status: node.status,
    tags: [...node.tags],
  };

  if (node.description != null) {
    authoringNode.description = node.description;
  }
  if (node.lastDuration != null) {
    authoringNode.lastDuration = node.lastDuration;
  }
  if (node.lastCost != null) {
    authoringNode.lastCost = node.lastCost;
  }
  return { ...authoringNode, ...definitionAuthority(node) };
}

function definitionAuthority(
  node: CanonicalNode
): Pick<WorkspaceGraphAuthoringNode, 'path' | 'metadata'> {
  if (workspaceNodeDefinitionId(node) != null) return {};
  const metadata = toCanvasAuthoringMetadata(node.metadata);
  return {
    ...(node.path == null ? {} : { path: node.path }),
    ...(metadata == null ? {} : { metadata }),
  };
}

function createAuthoringEdgeId(sourceId: string, targetId: string): string {
  return `draft_edge_${sourceId}_${targetId}`;
}

function buildCanonicalEdgeLookup(
  canonicalEdges: readonly CanonicalEdge[]
): Map<string, CanonicalEdge> {
  return new Map(canonicalEdges.map((edge) => [`${edge.sourceId}::${edge.targetId}`, edge]));
}

function isDbtReferenceOnlyEdge(args: {
  sourceNode: CanonicalNode | undefined;
  targetNode: CanonicalNode | undefined;
}): boolean {
  const { sourceNode, targetNode } = args;
  if (sourceNode == null || targetNode == null) {
    return false;
  }

  return consumesDbtReference(targetNode) && providesDbtReference(sourceNode);
}

function consumesDbtReference(node: CanonicalNode): boolean {
  return isDbtCompatibleModel(node) || (node.pluginId === 'dbt' && node.kind === 'dbt:snapshot');
}

function providesDbtReference(node: CanonicalNode): boolean {
  return (
    isDbtCompatibleSource(node) ||
    (node.pluginId === 'dbt' && node.kind === 'dbt:macro') ||
    (node.pluginId === 'dvt.warehouse-source' && node.kind === 'dvt:source')
  );
}

function resolveAuthoringEdgeMetadata(args: {
  canonicalEdge: CanonicalEdge | undefined;
  sourceNode: CanonicalNode | undefined;
  targetNode: CanonicalNode | undefined;
}) {
  const metadata = toCanvasAuthoringMetadata(args.canonicalEdge?.metadata);
  if (!isDbtReferenceOnlyEdge(args)) {
    return metadata;
  }

  if (metadata != null && Object.hasOwn(metadata, 'executionDependency')) {
    return metadata;
  }

  return {
    ...(metadata ?? {}),
    executionDependency: false,
  };
}

function projectDraftEdgeToAuthoringEdge(
  edge: CanvasDraftEdge,
  canonicalEdgeLookup: ReadonlyMap<string, CanonicalEdge>,
  canonicalNodesById: ReadonlyMap<string, CanonicalNode>,
  preserveExecutionGate = false
): WorkspaceGraphAuthoringEdge {
  const canonicalEdge = canonicalEdgeLookup.get(`${edge.sourceId}::${edge.targetId}`);
  const canonicalMetadata = resolveAuthoringEdgeMetadata({
    canonicalEdge,
    sourceNode: canonicalNodesById.get(edge.sourceId),
    targetNode: canonicalNodesById.get(edge.targetId),
  });
  const gateMetadata = preserveExecutionGate
    ? canonicalMetadata
    : withWorkspaceGraphAuthoringEdgeExecutionGate(canonicalMetadata, edge.executionGate ?? 'open');
  const metadata =
    edge.inputBindings == null
      ? gateMetadata
      : { ...gateMetadata, inputBindings: edge.inputBindings };

  return {
    id: canonicalEdge?.id ?? createAuthoringEdgeId(edge.sourceId, edge.targetId),
    sourceId: edge.sourceId,
    targetId: edge.targetId,
    relation: canonicalEdge?.relation ?? 'lineage',
    ...(metadata == null ? {} : { metadata }),
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

function draftDefinitionAndPlacementIds(input: CanvasAuthoringDraftBuildInput): string[] {
  return [
    ...new Set([
      ...input.nodeIds,
      ...input.canonicalNodes
        .filter(
          (node) =>
            (node.role === 'input' || node.role === 'transform') &&
            workspaceNodeDefinitionId(node) == null
        )
        .map((node) => node.id),
    ]),
  ];
}

function includesEndpoints(ids: ReadonlySet<string>, edge: CanvasDraftEdge): boolean {
  return ids.has(edge.sourceId) && ids.has(edge.targetId);
}

export function buildCanvasAuthoringDraft(
  input: CanvasAuthoringDraftBuildInput
): WorkspaceGraphAuthoringDraft {
  const canonicalNodesById = new Map(input.canonicalNodes.map((node) => [node.id, node]));
  const canonicalEdgeLookup = buildCanonicalEdgeLookup(input.canonicalEdges);
  const semanticNodeIds = draftDefinitionAndPlacementIds(input);
  const visibleIds = new Set(input.nodeIds);
  const semanticIds = new Set(semanticNodeIds);
  const hiddenDefinitionEdges = input.canonicalEdges.filter(
    (edge) => includesEndpoints(semanticIds, edge) && !includesEndpoints(visibleIds, edge)
  );
  const edges = [
    ...new Map(
      [...hiddenDefinitionEdges, ...input.visibleEdges].map((edge) => [
        `${edge.sourceId}::${edge.targetId}`,
        edge,
      ])
    ).values(),
  ];

  return {
    canvas: {
      ...(input.canvas.id == null ? {} : { id: input.canvas.id }),
      kind: input.canvas.kind,
      title: input.canvas.title,
      ...(input.canvas.environmentId == null ? {} : { environmentId: input.canvas.environmentId }),
      ...(input.canvas.defaultPermission == null
        ? {}
        : { defaultPermission: input.canvas.defaultPermission }),
    },
    nodeIds: [...input.nodeIds],
    nodePositions: { ...input.nodePositions },
    nodes: semanticNodeIds.map((nodeId) => {
      const node = canonicalNodesById.get(nodeId);
      if (node == null) {
        throw new Error(`Workspace graph draft references unknown node ${nodeId}.`);
      }

      return projectCanonicalNodeToAuthoringNode(node);
    }),
    edges: edges.map((edge) =>
      projectDraftEdgeToAuthoringEdge(
        edge,
        canonicalEdgeLookup,
        canonicalNodesById,
        !includesEndpoints(visibleIds, edge)
      )
    ),
  };
}
