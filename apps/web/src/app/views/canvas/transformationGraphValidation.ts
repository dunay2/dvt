import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';

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
};

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

function buildInvalidResult(
  summary: string,
  scopedNodeIds: string[],
  scopedEdgeIds: string[] = []
): TransformationGraphValidationResult {
  const signature = `nodes:${[...scopedNodeIds].sort().join(',')}|edges:${[...scopedEdgeIds].sort().join(',')}`;
  return {
    valid: false,
    summary,
    draftSignature: signature,
    scopedNodeIds,
    scopedEdgeIds,
    nodeRolesById: {},
  };
}

export function validateTransformationGraph({
  nodes,
  edges,
  selectedNodeIds = [],
}: ValidateTransformationGraphArgs): TransformationGraphValidationResult {
  const scopedNodes =
    selectedNodeIds.length > 0 ? nodes.filter((node) => selectedNodeIds.includes(node.id)) : nodes;
  const scopedNodeIds = scopedNodes.map((node) => node.id);
  const scopedNodeIdSet = new Set(scopedNodeIds);
  const scopedEdges = edges.filter(
    (edge) => scopedNodeIdSet.has(edge.sourceId) && scopedNodeIdSet.has(edge.targetId)
  );
  const scopedEdgeIds = scopedEdges.map((edge) => edge.id);

  if (scopedNodes.length !== 3) {
    return buildInvalidResult(
      'Plan requires exactly 3 nodes: source, sql_transform, and sink.',
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
      scopedNodeIds,
      scopedEdgeIds
    );
  }

  if (scopedEdges.length !== 2) {
    return buildInvalidResult(
      'Plan requires exactly 2 edges: source -> sql_transform and sql_transform -> sink.',
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
      scopedNodeIds,
      scopedEdgeIds
    );
  }

  const draftSignature = `nodes:${[...scopedNodeIds].sort().join(',')}|edges:${[...scopedEdgeIds].sort().join(',')}`;

  return {
    valid: true,
    summary: 'Transformation draft is valid for preview.',
    draftSignature,
    scopedNodeIds,
    scopedEdgeIds,
    nodeRolesById,
  };
}
