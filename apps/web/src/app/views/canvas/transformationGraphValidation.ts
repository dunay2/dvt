import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { buildPreviewGraphSignature } from './previewGraphSource';

export type TransformationNodeRole = 'source' | 'sql_transform' | 'sink';

export type TransformationGraphValidationResult = {
  valid: boolean;
  summary: string;
  draftSignature: string;
  scopedNodeIds: string[];
  scopedEdgeIds: string[];
  nodeRolesById: Record<string, TransformationNodeRole>;
};

type ValidateTransformationGraphArgs = {
  nodes: CanonicalNode[];
  edges: CanonicalEdge[];
  selectedNodeIds?: string[];
  workspaceNodeIds?: string[];
};

function buildDraftSignature(
  allNodes: readonly CanonicalNode[],
  allEdges: readonly CanonicalEdge[],
  scopedNodeIds: readonly string[]
): string {
  return buildPreviewGraphSignature(allNodes, allEdges, scopedNodeIds);
}

function buildInvalidResult(
  summary: string,
  allNodes: readonly CanonicalNode[],
  allEdges: readonly CanonicalEdge[],
  scopedNodeIds: string[],
  scopedEdgeIds: string[] = []
): TransformationGraphValidationResult {
  const signature = buildDraftSignature(allNodes, allEdges, scopedNodeIds);
  return {
    valid: false,
    summary,
    draftSignature: signature,
    scopedNodeIds,
    scopedEdgeIds,
    nodeRolesById: {},
  };
}

function mapCanonicalRole(node: CanonicalNode): TransformationNodeRole | null {
  switch (node.role) {
    case 'input':
      return 'source';
    case 'transform':
      return 'sql_transform';
    case 'output':
      return 'sink';
    default:
      return null;
  }
}

export function validateTransformationGraph({
  nodes,
  edges,
  selectedNodeIds = [],
  workspaceNodeIds = [],
}: ValidateTransformationGraphArgs): TransformationGraphValidationResult {
  const scopeNodeIds =
    selectedNodeIds.length > 0
      ? selectedNodeIds
      : workspaceNodeIds.length > 0
        ? workspaceNodeIds
        : nodes.map((node) => node.id);
  const scopeNodeIdSet = new Set(scopeNodeIds);
  const scopedNodes = nodes.filter((node) => scopeNodeIdSet.has(node.id));
  const scopedNodeIds = scopedNodes.map((node) => node.id);
  const scopedNodeIdSet = new Set(scopedNodeIds);
  const scopedEdges = edges.filter(
    (edge) => scopedNodeIdSet.has(edge.sourceId) && scopedNodeIdSet.has(edge.targetId)
  );
  const scopedEdgeIds = scopedEdges.map((edge) => edge.id);

  if (scopedNodes.length !== 3) {
    return buildInvalidResult(
      'Plan requires exactly 3 nodes: source, sql_transform, and sink.',
      nodes,
      edges,
      scopedNodeIds,
      scopedEdgeIds
    );
  }

  const nodeRolesById: Record<string, TransformationNodeRole> = {};
  for (const node of scopedNodes) {
    const mappedRole = mapCanonicalRole(node);
    if (!mappedRole) {
      return buildInvalidResult(
        'Plan supports only input, transform, and output nodes in this vertical.',
        nodes,
        edges,
        scopedNodeIds,
        scopedEdgeIds
      );
    }
    nodeRolesById[node.id] = mappedRole;
  }

  const roleCounts = scopedNodes.reduce(
    (acc, node) => {
      const mappedRole = nodeRolesById[node.id] as TransformationNodeRole | undefined;
      if (!mappedRole) {
        return acc;
      }
      acc[mappedRole] += 1;
      return acc;
    },
    {
      source: 0,
      sql_transform: 0,
      sink: 0,
    } satisfies Record<TransformationNodeRole, number>
  );

  if (roleCounts.source !== 1 || roleCounts.sql_transform !== 1 || roleCounts.sink !== 1) {
    return buildInvalidResult(
      'Plan requires exactly 1 source, 1 sql_transform, and 1 sink.',
      nodes,
      edges,
      scopedNodeIds,
      scopedEdgeIds
    );
  }

  if (scopedEdges.length !== 2) {
    return buildInvalidResult(
      'Plan requires exactly 2 edges: source -> sql_transform and sql_transform -> sink.',
      nodes,
      edges,
      scopedNodeIds,
      scopedEdgeIds
    );
  }

  const hasSourceToTransform = scopedEdges.some(
    (edge) =>
      nodeRolesById[edge.sourceId] === 'source' && nodeRolesById[edge.targetId] === 'sql_transform'
  );
  const hasTransformToSink = scopedEdges.some(
    (edge) =>
      nodeRolesById[edge.sourceId] === 'sql_transform' && nodeRolesById[edge.targetId] === 'sink'
  );

  if (!hasSourceToTransform || !hasTransformToSink) {
    return buildInvalidResult(
      'Plan edges must follow source -> sql_transform -> sink.',
      nodes,
      edges,
      scopedNodeIds,
      scopedEdgeIds
    );
  }

  const draftSignature = buildDraftSignature(nodes, edges, scopedNodeIds);

  return {
    valid: true,
    summary: 'Transformation draft is valid for preview.',
    draftSignature,
    scopedNodeIds,
    scopedEdgeIds,
    nodeRolesById,
  };
}
